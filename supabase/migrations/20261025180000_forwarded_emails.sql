-- WHERE · import par transfert d'email (ticket 7)
-- 1. forward_addresses : une adresse de transfert privée par utilisateur (inbox+{token}@domaine).
-- 2. forwarded_emails : chaque email reçu par le webhook Resend, sa classification par l'API
--    Anthropic et, pour une réservation, la qualification de l'utilisateur.
-- 3. signals : provenance « qualification » (réponses de l'écran « Qualifier mes expériences »).
-- Rien n'entre dans la mémoire sans validation : le webhook n'écrit que forwarded_emails, les
-- signaux naissent de la qualification, sous la session de l'utilisateur (RLS).

-- ---------------------------------------------------------------------------
-- Énumérations
-- ---------------------------------------------------------------------------

-- Classification d'un email transféré. Doit rester identique à src/lib/inbound/rules.ts.
create type public.forwarded_email_kind as enum (
  'table',         -- réservation de table
  'hotel',         -- réservation d'hôtel
  'activity',      -- activité, événement, billet
  'delivery',      -- livraison ou commande à emporter : jamais une visite
  'cancellation',  -- annulation : jamais une visite
  'other'          -- tout le reste
);

create type public.forwarded_email_status as enum (
  'pending',    -- réservation détectée, en attente de qualification
  'qualified',  -- l'utilisateur a répondu à « Tu y es vraiment allé ? »
  'skipped',    -- « Ignorer ce lieu »
  'cancelled',  -- un email d'annulation correspondant est arrivé avant la qualification
  'excluded'    -- livraison, annulation ou autre : écarté et compté, jamais qualifié
);

alter type public.signal_source_type add value if not exists 'qualification';

-- ---------------------------------------------------------------------------
-- forward_addresses · l'adresse de transfert de chaque utilisateur
-- ---------------------------------------------------------------------------

create table public.forward_addresses (
  user_id uuid primary key references public.users (id) on delete cascade,
  -- Partie variable de inbox+{token}@domaine : seule clé qui relie un email entrant à un compte.
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 20),
  created_at timestamptz not null default now(),
  constraint forward_addresses_token_format check (token ~ '^[a-z0-9]{12,32}$')
);

comment on table public.forward_addresses is 'Adresse de transfert privée (inbox+{token}@domaine). Lue par le webhook Resend (service_role) pour retrouver le destinataire.';

alter table public.forward_addresses enable row level security;

-- Lecture seule pour l'utilisateur : il ne choisit pas son jeton.
create policy "forward_addresses: lecture par le propriétaire"
  on public.forward_addresses for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Chaque compte reçoit son adresse à l'inscription ; les comptes existants aussi.
create function public.handle_new_user_forward_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.forward_addresses (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_forward_address() from public, anon, authenticated;

create trigger on_user_created_forward_address
  after insert on public.users
  for each row execute function public.handle_new_user_forward_address();

insert into public.forward_addresses (user_id)
select id from public.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- forwarded_emails · emails reçus, classés, puis qualifiés
-- ---------------------------------------------------------------------------

create table public.forwarded_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- Identifiant Resend de l'email reçu : rend le webhook idempotent (Resend peut le rejouer).
  resend_email_id text not null unique,
  -- Expéditeur vérifié : l'adresse du compte, authentifiée (SPF/DKIM/DMARC) par Resend.
  from_address text not null,
  subject text,
  -- Texte brut de l'email, borné. Sert à relire une classification, jamais affiché à un tiers.
  body_text text not null,
  received_at timestamptz not null,
  kind public.forwarded_email_kind not null,
  platform text,
  place_name text,
  city text,
  reserved_for date,
  status public.forwarded_email_status not null,
  -- Qualification, mot pour mot depuis la maquette (scrQualify).
  place_id uuid references public.places (id) on delete set null,
  qualified_at timestamptz,
  visited text,
  recommend text,
  occasion text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  constraint forwarded_emails_body_size check (length(body_text) <= 40000),
  -- Une réservation porte toujours le nom du lieu, sinon elle ne peut pas être qualifiée.
  constraint forwarded_emails_reservation_has_place check (
    kind not in ('table', 'hotel', 'activity') or length(trim(coalesce(place_name, ''))) > 0
  ),
  -- Livraisons, annulations et autres sont écartés : ils ne passent jamais par la qualification.
  constraint forwarded_emails_status_matches_kind check (
    (kind in ('table', 'hotel', 'activity')) = (status <> 'excluded')
  ),
  constraint forwarded_emails_visited_values check (
    visited is null or visited in ('Oui', 'Non', 'Je ne sais plus')
  ),
  constraint forwarded_emails_recommend_values check (
    recommend is null or recommend in ('Absolument', 'Oui, dans certains contextes', 'Pas vraiment', 'Non')
  ),
  constraint forwarded_emails_qualified_has_answer check (
    (status = 'qualified') = (visited is not null and qualified_at is not null)
  ),
  -- Sans visite, ni recommandation, ni occasion, ni note.
  constraint forwarded_emails_not_visited_is_empty check (
    visited is distinct from 'Non' and visited is distinct from 'Je ne sais plus'
    or (recommend is null and occasion = '{}' and note is null)
  ),
  constraint forwarded_emails_note_size check (note is null or length(note) <= 600)
);

comment on table public.forwarded_emails is 'Emails transférés à l''adresse de l''utilisateur. Écrits par le webhook Resend (service_role) ; l''utilisateur ne modifie que la qualification.';

create index forwarded_emails_user_received_idx on public.forwarded_emails (user_id, received_at desc);
create index forwarded_emails_user_status_idx on public.forwarded_emails (user_id, status);

alter table public.forwarded_emails enable row level security;

create policy "forwarded_emails: lecture par le propriétaire"
  on public.forwarded_emails for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "forwarded_emails: qualification par le propriétaire"
  on public.forwarded_emails for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "forwarded_emails: suppression par le propriétaire"
  on public.forwarded_emails for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Pas de politique d'insertion : seul le webhook (service_role) crée des lignes. Et l'utilisateur ne
-- modifie que les colonnes de la qualification, jamais la classification ni l'email lui-même.
revoke insert, update on public.forwarded_emails from anon, authenticated;
grant update (status, place_id, qualified_at, visited, recommend, occasion, note)
  on public.forwarded_emails to authenticated;

-- Une réservation quitte « pending » une seule fois : on ne requalifie pas (pas de signaux en double).
create function public.check_forwarded_email_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'pending' and new.status is distinct from old.status then
    raise exception 'Cet email a déjà été traité.' using errcode = '23514';
  end if;
  if old.status <> 'pending' and (
    new.visited is distinct from old.visited
    or new.recommend is distinct from old.recommend
    or new.occasion is distinct from old.occasion
    or new.note is distinct from old.note
  ) then
    raise exception 'Cette qualification est déjà enregistrée.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_forwarded_email_transition() from public, anon, authenticated;

create trigger forwarded_emails_transition
  before update on public.forwarded_emails
  for each row execute function public.check_forwarded_email_transition();
