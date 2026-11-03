-- Connexion par email sans recopier de code (2026-11-03).
-- La page restée ouverte (Safari, l'appli installée) attend ; le lien de l'email, ouvert ailleurs
-- (navigateur de Gmail), approuve la demande d'un geste ; la page d'origine se connecte alors seule.
-- Lue et écrite par le serveur uniquement (service_role) : aucune policy, aucun droit pour anon ou
-- authenticated. token_hash vaut une connexion : il expire au bout de 15 minutes et ne sert qu'une fois.

create table public.login_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- hashed_token renvoyé par auth.admin.generateLink, échangé par verifyOtp dans le navigateur qui se connecte.
  token_hash text not null,
  -- Empreintes SHA-256 des deux secrets : celui du cookie de la page d'origine, celui du lien de l'email.
  browser_secret_hash text not null,
  approve_secret_hash text not null,
  next_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  approved_at timestamptz,
  consumed_at timestamptz
);

create index login_requests_email_created_idx on public.login_requests (email, created_at desc);

alter table public.login_requests enable row level security;
revoke all on public.login_requests from anon, authenticated;
