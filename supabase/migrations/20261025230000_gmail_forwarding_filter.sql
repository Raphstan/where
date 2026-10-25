-- WHERE · transfert automatique par filtre Gmail (ticket 12)
-- L'utilisateur ne partage pas sa boîte mail : il crée dans Gmail un filtre qui transfère seulement
-- les emails des plateformes de réservation vers son adresse WHERE. Pour l'autoriser, Gmail envoie
-- d'abord un code de confirmation à cette adresse ; le webhook le garde ici pour l'afficher à
-- l'utilisateur, qui le recopie lui-même dans Gmail. WHERE ne confirme rien à sa place.

alter table public.forward_addresses
  add column gmail_confirmation_code text,
  add column gmail_confirmation_from text,
  add column gmail_confirmation_at timestamptz,
  add constraint forward_addresses_gmail_code_format
    check (gmail_confirmation_code is null or gmail_confirmation_code ~ '^[0-9]{6,12}$'),
  add constraint forward_addresses_gmail_from_size
    check (gmail_confirmation_from is null or length(gmail_confirmation_from) <= 320),
  add constraint forward_addresses_gmail_complete
    check ((gmail_confirmation_code is null) = (gmail_confirmation_at is null));

comment on column public.forward_addresses.gmail_confirmation_code is 'Dernier code « Gmail Forwarding Confirmation » reçu, écrit par le webhook (service_role), lu par l''utilisateur.';
comment on column public.forward_addresses.gmail_confirmation_from is 'Adresse Gmail qui a demandé le transfert, pour que l''utilisateur la reconnaisse.';

-- Les emails écartés (publicités, notifications) ne gardent pas leur texte : un filtre automatique en
-- reçoit davantage, et WHERE n'en a pas besoin. Livraisons et annulations gardent le leur (relecture
-- d'une classification « jamais une visite »).
alter table public.forwarded_emails
  drop constraint forwarded_emails_body_size,
  add constraint forwarded_emails_body_size check (length(body_text) <= 40000);
