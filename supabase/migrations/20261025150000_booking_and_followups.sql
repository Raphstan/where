-- WHERE · réservation et retour après visite (ticket 6)
-- 1. places : moyens de réserver ou de joindre le lieu (CLAUDE.md § 6.6, « options de réservation
--    avec les URL/numéros associés »). WHERE ne réserve pas : ce ne sont que des liens sortants.
-- 2. signals : provenance « post_visit_feedback » et partage explicite avec le cercle (désactivé
--    par défaut, jamais public).
-- 3. visit_followups : « As-tu réservé ? » → Oui crée un suivi ; le cron Vercel le rend « dû » le
--    lendemain, l'app pose alors les trois questions du retour.

-- ---------------------------------------------------------------------------
-- places · moyens réellement disponibles pour ce lieu
-- ---------------------------------------------------------------------------

alter table public.places
  add column website_url text,
  add column phone text,
  add column whatsapp text,
  add column ontopo_url text,
  add column tabit_url text,
  add constraint places_website_url_http check (website_url is null or website_url ~* '^https?://\S+$'),
  add constraint places_ontopo_url_http check (ontopo_url is null or ontopo_url ~* '^https?://\S+$'),
  add constraint places_tabit_url_http check (tabit_url is null or tabit_url ~* '^https?://\S+$'),
  add constraint places_phone_format check (phone is null or phone ~ '^\+?[0-9 ().-]{6,20}$'),
  add constraint places_whatsapp_format check (whatsapp is null or whatsapp ~ '^\+?[0-9 ().-]{6,20}$');

comment on column public.places.website_url is 'Site du lieu (« Ouvrir le site du restaurant »).';
comment on column public.places.phone is 'Téléphone, format international de préférence (« Appeler »).';
comment on column public.places.whatsapp is 'Numéro WhatsApp du lieu (« Envoyer un WhatsApp », lien wa.me).';
comment on column public.places.ontopo_url is 'Page Ontopo du lieu, seulement si elle est connue. Aucune intégration : lien sortant.';
comment on column public.places.tabit_url is 'Page Tabit du lieu, seulement si elle est connue. Aucune intégration : lien sortant.';

-- ---------------------------------------------------------------------------
-- signals · retour après visite et partage avec le cercle
-- ---------------------------------------------------------------------------

alter type public.signal_source_type add value if not exists 'post_visit_feedback';

alter table public.signals
  add column shared_with_circle boolean not null default false;

comment on column public.signals.shared_with_circle is 'Maquette : « Partager ce retour avec mon cercle privé ». Désactivé par défaut, jamais publié publiquement.';

-- ---------------------------------------------------------------------------
-- visit_followups · une réservation déclarée, et son retour du lendemain
-- ---------------------------------------------------------------------------

create table public.visit_followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  booked_at timestamptz not null default now(),
  -- Le lendemain matin (heure d'Israël), calculé à la création : src/lib/booking/followup.ts.
  due_at timestamptz not null,
  -- Posé par le cron (/api/cron/visit-followups) : le retour est alors proposé dans l'app.
  prompted_at timestamptz,
  answered_at timestamptz,
  -- Réponses, mot pour mot depuis la maquette (feedbackMsg).
  rating text,
  recommend text,
  occasion text[] not null default '{}',
  -- Le signal créé par le retour (visited ou recommended). Null si « Je n'y suis finalement pas allé ».
  signal_id uuid references public.signals (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint visit_followups_due_after_booking check (due_at > booked_at),
  constraint visit_followups_rating_values check (
    rating is null or rating in ('Excellent', 'Bien', 'Moyen', 'Pas pour moi', 'Je n’y suis finalement pas allé')
  ),
  constraint visit_followups_recommend_values check (
    recommend is null or recommend in ('Absolument', 'Dans certains contextes', 'Pas vraiment')
  ),
  constraint visit_followups_answered_has_rating check ((answered_at is null) = (rating is null)),
  -- Pas de visite, pas de recommandation ni de signal.
  constraint visit_followups_not_visited_is_empty check (
    rating is distinct from 'Je n’y suis finalement pas allé' or (recommend is null and signal_id is null)
  )
);

comment on table public.visit_followups is 'Réservation déclarée au retour d''un lien sortant (« As-tu réservé chez X ? » → Oui), et le retour post-visite du lendemain. Privé.';

-- Un seul suivi en attente par lieu : répondre « Oui » deux fois ne crée pas deux réservations.
create unique index visit_followups_one_open_per_place
  on public.visit_followups (user_id, place_id)
  where answered_at is null;

create index visit_followups_due_idx on public.visit_followups (due_at) where prompted_at is null and answered_at is null;
create index visit_followups_user_idx on public.visit_followups (user_id, prompted_at) where answered_at is null;

alter table public.visit_followups enable row level security;

create policy "visit_followups: tout accès par le propriétaire"
  on public.visit_followups for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- La conversation et le signal cités appartiennent au propriétaire du suivi.
create function public.check_visit_followup_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.conversation_id is not null and not exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id and c.user_id = new.user_id
  ) then
    raise exception 'La conversation n''appartient pas au propriétaire du suivi.'
      using errcode = '23514';
  end if;
  if new.signal_id is not null and not exists (
    select 1 from public.signals s
    where s.id = new.signal_id and s.user_id = new.user_id and s.source_member_id is null
  ) then
    raise exception 'Le signal du retour doit appartenir au propriétaire du suivi et venir de lui.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_visit_followup_owner() from public, anon, authenticated;

create trigger visit_followups_owner
  before insert or update of conversation_id, signal_id, user_id on public.visit_followups
  for each row execute function public.check_visit_followup_owner();
