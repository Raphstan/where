-- ---------------------------------------------------------------------------
-- Bêta privée : qui peut créer un compte.
-- Les inscriptions libres sont fermées (config.toml : enable_signup = false ; à reproduire sur le
-- projet hébergé). Le serveur crée le compte lui-même, seulement si l'email est invité ici, ou si la
-- personne arrive par un lien privé de proche (/r/{token} → /join/{token}), qui vaut invitation.
-- Les comptes déjà créés gardent leur accès.
-- ---------------------------------------------------------------------------

create table public.beta_access (
  email text primary key,
  note text,
  invited_at timestamptz not null default now(),
  constraint beta_access_email_lowercase check (email = lower(trim(email))),
  constraint beta_access_email_shape check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

comment on table public.beta_access is 'Emails invités à la bêta privée. Lue et écrite uniquement côté serveur (service_role) ; aucune policy : invisible pour les utilisateurs.';
comment on column public.beta_access.note is 'Libre : « famille », « waitlist vague 1 »…';

alter table public.beta_access enable row level security;
-- Pas de policy : seul le service_role (qui contourne RLS) y accède.
