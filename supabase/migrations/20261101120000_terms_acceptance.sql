-- ---------------------------------------------------------------------------
-- Acceptation des conditions d'utilisation et de la politique de confidentialité.
-- Écrite côté serveur (service_role) au moment où le lien de connexion est demandé avec la case
-- cochée. Un compte ne peut pas être créé sans elle (src/lib/auth/beta-access.ts).
-- terms_version = date de la version acceptée (LEGAL_VERSION, src/content/legal/types.ts).
-- ---------------------------------------------------------------------------

alter table public.users
  add column terms_version text,
  add column terms_accepted_at timestamptz,
  add constraint users_terms_together check ((terms_version is null) = (terms_accepted_at is null));

comment on column public.users.terms_version is 'Version des CGU et de la politique de confidentialité acceptée (date ISO). Null : comptes antérieurs, jamais acceptée.';
comment on column public.users.terms_accepted_at is 'Date de la dernière acceptation.';
