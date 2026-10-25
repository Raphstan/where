-- Tests RLS (pgTAP). Lancer : npm run db:test
-- Vérifie : un utilisateur ne lit que ses propres données ; une réponse n'est lisible que par
-- l'auteur de la demande et par son auteur ; un signal public n'est jamais attribué.
begin;
select plan(15);

-- Trois comptes : A (demandeur), B (proche de A, avec compte), C (étranger).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local');

select is(
  (select count(*) from public.users where email like '%@test.local'),
  3::bigint,
  'le trigger crée un profil public.users par compte'
);

insert into public.places (id, name, city) values
  ('10000000-0000-0000-0000-000000000001', 'Tishbi Winery', 'Zikhron Ya''akov');

-- Un proche du cercle de C, pour vérifier qu'un signal de A ne peut pas le citer.
insert into public.circle_members (id, user_id, name, email) values
  ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Proche de C', 'pc@test.local');

-- Données de A
insert into public.circle_members (id, user_id, member_id, name, trust_domains) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-00000000000b', 'B', '{restaurants,hotels}');

insert into public.signals (user_id, place_id, evidence_level, source_type) values
  ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'visited', 'manual');

insert into public.requests (id, user_id, question, message) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
   'Où déjeuner à Zikhron ?', 'A cherche un endroit pour déjeuner samedi à Zikhron. Une idée ?');

insert into public.request_recipients (id, request_id, circle_member_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001');

-- Réponse de B, écrite par la page invité (service_role / postgres).
insert into public.request_replies (id, request_id, recipient_id, place_id, visited, note) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', true,
   'J''y suis allée avec les enfants.');

-- ---------------------------------------------------------------- en tant que A
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*) from public.circle_members), 1::bigint, 'A voit son cercle');
select is((select count(*) from public.signals), 1::bigint, 'A voit ses signaux');
select is((select count(*) from public.requests), 1::bigint, 'A voit ses demandes');
select is((select count(*) from public.request_replies), 1::bigint, 'A voit la réponse à sa demande');

select throws_ok(
  $$ insert into public.signals (user_id, place_id, evidence_level, source_type)
     values ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001', 'saved', 'manual') $$,
  '42501',
  null,
  'A ne peut pas écrire dans la mémoire de C'
);

select throws_ok(
  $$ insert into public.signals (user_id, place_id, evidence_level, source_type, source_member_id)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'public', 'public',
             '20000000-0000-0000-0000-000000000001') $$,
  '23514',
  null,
  'un signal public ne peut pas être attribué à un proche'
);

select throws_ok(
  $$ insert into public.signals (user_id, place_id, evidence_level, source_type)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'recommended', 'network_reply') $$,
  '23514',
  null,
  'une réponse du réseau doit être attribuée à un membre du cercle'
);

select throws_ok(
  $$ insert into public.signals (user_id, place_id, evidence_level, source_type, source_member_id)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'recommended', 'manual',
             '20000000-0000-0000-0000-00000000000c') $$,
  '23514',
  null,
  'un signal ne peut citer qu''un proche du cercle de son propriétaire'
);

select lives_ok(
  $$ insert into public.signals (user_id, place_id, evidence_level, source_type, source_member_id)
     values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'recommended', 'manual',
             '20000000-0000-0000-0000-000000000001') $$,
  'un signal peut citer un proche du cercle de son propriétaire'
);

-- ---------------------------------------------------------------- en tant que B (le proche)
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*) from public.circle_members), 0::bigint, 'B ne voit pas qu''il est dans le cercle de A');
select is((select count(*) from public.signals), 0::bigint, 'B ne voit pas les signaux de A');
select is((select count(*) from public.requests), 0::bigint, 'B ne voit pas les demandes de A');
select is((select count(*) from public.request_replies), 1::bigint, 'B voit la réponse qu''il a donnée');

-- ---------------------------------------------------------------- en tant que C (étranger)
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*) from public.request_replies), 0::bigint, 'C ne voit aucune réponse');

select * from finish();
rollback;
