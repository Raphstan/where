-- WHERE · schéma initial
-- Voir CLAUDE.md § 2 (principes) et § 6.6 (modèle de données).
-- Toutes les tables ont RLS activée. Un utilisateur ne lit que ses propres données.

-- ---------------------------------------------------------------------------
-- Énumérations strictes
-- ---------------------------------------------------------------------------

-- Niveaux de preuve, du plus fort au plus faible. Doit rester identique à src/lib/evidence.ts.
create type public.evidence_level as enum (
  'recommended',
  'visited',
  'booked_confirmed',
  'booked',
  'saved',
  'public'
);

-- Provenance d'un signal.
create type public.signal_source_type as enum (
  'manual',
  'email_forward',
  'link_share',
  'network_reply',
  'public'
);

-- Domaines de confiance d'un membre du cercle (maquette : Tout, Restaurants, Hôtels, Nightlife,
-- Voyages, Activités, Famille, Business).
create type public.trust_domain as enum (
  'all',
  'restaurants',
  'hotels',
  'nightlife',
  'travel',
  'activities',
  'family',
  'business'
);

-- ---------------------------------------------------------------------------
-- users · 1:1 avec auth.users
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  city text,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Profil applicatif, créé automatiquement à l''inscription.';

-- Création du profil à l'inscription (magic link).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.users enable row level security;

create policy "users: lecture de son profil"
  on public.users for select
  to authenticated
  using (id = (select auth.uid()));

create policy "users: mise à jour de son profil"
  on public.users for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- places · référentiel de lieux (données factuelles, pas personnelles)
-- ---------------------------------------------------------------------------

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  google_place_id text unique,
  lat double precision,
  lng double precision,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint places_coordinates_both_or_none
    check ((lat is null) = (lng is null)),
  constraint places_lat_range check (lat is null or (lat between -90 and 90)),
  constraint places_lng_range check (lng is null or (lng between -180 and 180))
);

comment on table public.places is 'Lieux. Un lieu est un fait partagé : lisible par tout utilisateur connecté. Ce qui est personnel vit dans signals.';

create index places_city_idx on public.places (city);
create index places_name_idx on public.places (lower(name));

alter table public.places enable row level security;

create policy "places: lecture par les utilisateurs connectés"
  on public.places for select
  to authenticated
  using (true);

create policy "places: création par un utilisateur connecté"
  on public.places for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "places: mise à jour par son créateur"
  on public.places for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- circle_members · cercle de confiance, unidirectionnel et invisible pour le membre
-- ---------------------------------------------------------------------------

create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  member_id uuid references public.users (id) on delete set null,
  name text not null,
  phone text,
  email text,
  relation text,
  trust_domains public.trust_domain[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint circle_members_name_not_blank check (length(trim(name)) > 0),
  constraint circle_members_reachable
    check (member_id is not null or phone is not null or email is not null),
  constraint circle_members_not_self
    check (member_id is null or member_id <> user_id)
);

comment on table public.circle_members is 'Proches d''un utilisateur. member_id est renseigné si le proche a un compte, sinon on garde nom + téléphone/email. Le proche ne voit jamais qu''il fait partie d''un cercle.';

create index circle_members_user_id_idx on public.circle_members (user_id);
create index circle_members_member_id_idx on public.circle_members (member_id);

alter table public.circle_members enable row level security;

create policy "circle_members: tout accès par le propriétaire du cercle"
  on public.circle_members for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- requests · question envoyée au réseau, et ses destinataires (un lien privé chacun)
-- ---------------------------------------------------------------------------

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint requests_question_not_blank check (length(trim(question)) > 0),
  constraint requests_message_not_blank check (length(trim(message)) > 0)
);

comment on table public.requests is 'Question posée au réseau. message est le texte pré-rédigé envoyé aux proches, après confirmation explicite.';

create index requests_user_id_idx on public.requests (user_id);

alter table public.requests enable row level security;

create policy "requests: tout accès par l'auteur"
  on public.requests for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.request_recipients (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  circle_member_id uuid not null references public.circle_members (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  sent_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, circle_member_id)
);

comment on table public.request_recipients is 'Un destinataire par proche sollicité, avec son lien privé (token). C''est ce lien qui attribue la réponse à la bonne personne.';

create index request_recipients_request_id_idx on public.request_recipients (request_id);

alter table public.request_recipients enable row level security;

-- Le propriétaire de la demande est le seul à voir ses destinataires.
-- La page invité (sans compte) lit le token côté serveur avec service_role.
create policy "request_recipients: tout accès par l'auteur de la demande"
  on public.request_recipients for all
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- request_replies · réponse d'un proche via son lien privé
-- ---------------------------------------------------------------------------

create table public.request_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  recipient_id uuid not null references public.request_recipients (id) on delete cascade,
  place_id uuid references public.places (id) on delete set null,
  place_text text,
  visited boolean not null,
  note text,
  visible_only_to_requester boolean not null default true,
  reusable boolean not null default true,
  created_at timestamptz not null default now(),
  constraint request_replies_place_given
    check (place_id is not null or length(trim(coalesce(place_text, ''))) > 0)
);

comment on table public.request_replies is 'Réponse d''un proche. reusable = consentement à réutiliser la réponse pour de futures questions du demandeur. Écrite uniquement par la page invité (service_role).';
comment on column public.request_replies.reusable is 'Maquette : « Autoriser WHERE à réutiliser cette reco pour {Prénom} à l''avenir ».';
comment on column public.request_replies.visible_only_to_requester is 'Maquette : « Visible seulement par {Prénom} ».';

create index request_replies_request_id_idx on public.request_replies (request_id);
create index request_replies_recipient_id_idx on public.request_replies (recipient_id);

alter table public.request_replies enable row level security;

-- Le proche qui a répondu peut relire sa réponse s'il a un compte relié à son entrée de cercle.
-- security definer : la vérification traverse request_recipients et circle_members, que le proche
-- n'a pas le droit de lire directement (le cercle reste invisible pour lui).
create function public.is_reply_author(p_recipient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.request_recipients rr
    join public.circle_members cm on cm.id = rr.circle_member_id
    where rr.id = p_recipient_id
      and cm.member_id = auth.uid()
  );
$$;

revoke execute on function public.is_reply_author(uuid) from public, anon;
grant execute on function public.is_reply_author(uuid) to authenticated;

create policy "request_replies: lecture par l'auteur de la demande ou l'auteur de la réponse"
  on public.request_replies for select
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.user_id = (select auth.uid())
    )
    or public.is_reply_author(recipient_id)
  );

create policy "request_replies: suppression par l'auteur de la demande"
  on public.request_replies for delete
  to authenticated
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- signals · une preuve reliant un lieu à la mémoire d'un utilisateur
-- ---------------------------------------------------------------------------

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  source_user_id uuid references public.users (id) on delete set null,
  source_member_id uuid references public.circle_members (id) on delete set null,
  request_reply_id uuid references public.request_replies (id) on delete set null,
  evidence_level public.evidence_level not null,
  occasion text[] not null default '{}',
  note text,
  source_type public.signal_source_type not null,
  reusable boolean not null default true,
  created_at timestamptz not null default now(),
  -- Principe 2 : un signal public n'est jamais attribué à une personne.
  constraint signals_public_never_attributed
    check (
      evidence_level <> 'public'
      or (source_user_id is null and source_member_id is null)
    ),
  -- Et réciproquement, la provenance « public » ne porte que le niveau public.
  constraint signals_public_source_matches_level
    check ((source_type = 'public') = (evidence_level = 'public')),
  -- Une réponse du réseau est toujours attribuée à un membre du cercle.
  constraint signals_network_reply_attributed
    check (source_type <> 'network_reply' or source_member_id is not null),
  constraint signals_not_self_sourced
    check (source_user_id is null or source_user_id <> user_id)
);

comment on table public.signals is 'Mémoire personnelle. user_id = propriétaire de la mémoire. source_member_id = proche à qui la preuve est attribuée (null = l''utilisateur lui-même). source_user_id = compte du proche s''il en a un.';
comment on column public.signals.reusable is 'false quand le proche a refusé la réutilisation : le signal ne sert qu''à la demande d''origine.';

create index signals_user_id_idx on public.signals (user_id);
create index signals_place_id_idx on public.signals (place_id);
create index signals_user_place_idx on public.signals (user_id, place_id);

alter table public.signals enable row level security;

create policy "signals: tout accès par le propriétaire de la mémoire"
  on public.signals for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
