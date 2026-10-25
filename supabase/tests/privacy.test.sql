-- Tests de la confidentialité (pgTAP). Lancer : npm run db:test
-- Vérifie : supprimer la source retire l'adresse de transfert, la rétablir tire un nouveau jeton ;
-- supprimer les lieux importés ne touche ni les réponses du cercle ni les retours après visite ;
-- supprimer son compte emporte toutes ses données et seulement les siennes.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a8', 'a8@test.local'),
  ('00000000-0000-0000-0000-0000000000c8', 'c8@test.local');

insert into public.places (id, name, city) values
  ('88000000-0000-0000-0000-000000000001', 'Fantastic', 'Tel Aviv'),
  ('88000000-0000-0000-0000-000000000002', 'HaMigdal', 'Jerusalem'),
  ('88000000-0000-0000-0000-000000000003', 'Beit Kandinof', 'Tel Aviv');

insert into public.circle_members (id, user_id, name, email) values
  ('88000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a8', 'Sarah', 'sarah@test.local');

insert into public.signals (user_id, place_id, source_member_id, evidence_level, source_type) values
  -- Importés : la réservation et sa qualification.
  ('00000000-0000-0000-0000-0000000000a8', '88000000-0000-0000-0000-000000000001', null, 'booked', 'email_forward'),
  ('00000000-0000-0000-0000-0000000000a8', '88000000-0000-0000-0000-000000000001', null, 'recommended', 'qualification'),
  ('00000000-0000-0000-0000-0000000000a8', '88000000-0000-0000-0000-000000000002', null, 'booked', 'email_forward'),
  -- Conservés : un retour après visite et une réponse de Sarah.
  ('00000000-0000-0000-0000-0000000000a8', '88000000-0000-0000-0000-000000000003', null, 'visited', 'post_visit_feedback'),
  ('00000000-0000-0000-0000-0000000000a8', '88000000-0000-0000-0000-000000000003', '88000000-0000-0000-0000-0000000000d1', 'recommended', 'network_reply'),
  -- Un autre compte, importé lui aussi.
  ('00000000-0000-0000-0000-0000000000c8', '88000000-0000-0000-0000-000000000001', null, 'booked', 'email_forward');

insert into public.forwarded_emails (user_id, resend_email_id, from_address, body_text, received_at, kind, platform, place_name, status) values
  ('00000000-0000-0000-0000-0000000000a8', 'r8-a1', 'a8@test.local', 'Table', now(), 'table', 'Tabit', 'Fantastic', 'pending'),
  ('00000000-0000-0000-0000-0000000000c8', 'r8-c1', 'c8@test.local', 'Table', now(), 'table', 'Tabit', 'MILA', 'pending');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a8","role":"authenticated"}';

-- Source
select throws_ok(
  $$ insert into public.forward_addresses (user_id, token) values ('00000000-0000-0000-0000-0000000000a8', 'choisiparmoi1234') $$,
  '42501',
  null,
  'A ne choisit pas son jeton'
);
create temp table old_token on commit drop as select token from public.forward_addresses;
delete from public.forward_addresses;
select is((select count(*) from public.forward_addresses), 0::bigint, 'A supprime sa source');
insert into public.forward_addresses (user_id) values ('00000000-0000-0000-0000-0000000000a8');
select isnt(
  (select token from public.forward_addresses),
  (select token from old_token),
  'rétablir la source tire un nouveau jeton : l''ancienne adresse ne sert plus'
);
select throws_ok(
  $$ insert into public.forward_addresses (user_id) values ('00000000-0000-0000-0000-0000000000c8') $$,
  '42501',
  null,
  'A ne crée pas d''adresse pour un autre compte'
);

-- Lieux importés
select is(public.imported_places_count(), 2, 'A a deux lieux importés');
select is(public.delete_imported_places(), 2, 'la suppression annonce deux lieux retirés');
select is(
  (select count(*) from public.signals where source_type in ('email_forward', 'qualification')),
  0::bigint,
  'plus aucun signal importé chez A'
);
select is((select count(*) from public.signals where source_type = 'post_visit_feedback'), 1::bigint, 'le retour après visite est conservé');
select is((select count(*) from public.signals where source_type = 'network_reply'), 1::bigint, 'la réponse de Sarah est conservée');
select is((select count(*) from public.forwarded_emails), 0::bigint, 'les emails transférés de A sont supprimés');

-- Compte
select lives_ok($$ select public.delete_my_account() $$, 'A supprime son compte');

reset role;
select is((select count(*) from auth.users where id = '00000000-0000-0000-0000-0000000000a8'), 0::bigint, 'le compte de A n''existe plus');
select is(
  (select count(*) from public.signals where user_id = '00000000-0000-0000-0000-0000000000a8')
  + (select count(*) from public.circle_members where user_id = '00000000-0000-0000-0000-0000000000a8'),
  0::bigint,
  'ses signaux et son cercle sont supprimés'
);
select is(
  (select count(*) from public.signals where user_id = '00000000-0000-0000-0000-0000000000c8')
  + (select count(*) from public.forwarded_emails where user_id = '00000000-0000-0000-0000-0000000000c8'),
  2::bigint,
  'les données de C sont intactes'
);

select * from finish();
rollback;
