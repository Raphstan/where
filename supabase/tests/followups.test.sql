-- Tests de la réservation et du retour après visite (pgTAP). Lancer : npm run db:test
-- Vérifie : un suivi est privé ; il ne cite ni la conversation ni le signal de quelqu'un d'autre ;
-- un seul suivi ouvert par lieu ; sans visite, ni recommandation ni signal ; liens de réservation http.
begin;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a6', 'a6@test.local'),
  ('00000000-0000-0000-0000-0000000000c6', 'c6@test.local');

insert into public.places (id, name, city) values
  ('16000000-0000-0000-0000-000000000001', 'Beit Kandinof', 'Tel Aviv');

insert into public.conversations (id, user_id, question) values
  ('36000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c6', 'Question de C');

insert into public.visit_followups (id, user_id, place_id, due_at) values
  ('66000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c6',
   '16000000-0000-0000-0000-000000000001', now() + interval '1 day');

select throws_ok(
  $$ update public.places set ontopo_url = 'javascript:alert(1)' where id = '16000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'un lien Ontopo doit être une URL http'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}';

select is((select count(*) from public.visit_followups), 0::bigint, 'A ne voit pas les suivis de C');

select throws_ok(
  $$ insert into public.visit_followups (user_id, place_id, conversation_id, due_at)
     values ('00000000-0000-0000-0000-0000000000a6', '16000000-0000-0000-0000-000000000001',
             '36000000-0000-0000-0000-0000000000c6', now() + interval '1 day') $$,
  '23514',
  null,
  'un suivi ne peut pas citer la conversation de quelqu''un d''autre'
);

select lives_ok(
  $$ insert into public.visit_followups (id, user_id, place_id, due_at)
     values ('66000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a6',
             '16000000-0000-0000-0000-000000000001', now() + interval '1 day') $$,
  'A crée son suivi'
);

select throws_ok(
  $$ insert into public.visit_followups (user_id, place_id, due_at)
     values ('00000000-0000-0000-0000-0000000000a6', '16000000-0000-0000-0000-000000000001', now() + interval '1 day') $$,
  '23505',
  null,
  'un seul suivi ouvert par lieu'
);

select throws_ok(
  $$ update public.visit_followups
     set answered_at = now(), rating = 'Je n’y suis finalement pas allé', recommend = 'Absolument'
     where id = '66000000-0000-0000-0000-0000000000a6' $$,
  '23514',
  null,
  'sans visite, pas de recommandation'
);

select throws_ok(
  $$ update public.visit_followups set answered_at = now(), rating = 'Génial'
     where id = '66000000-0000-0000-0000-0000000000a6' $$,
  '23514',
  null,
  'seules les réponses de la maquette sont acceptées'
);

insert into public.signals (id, user_id, place_id, evidence_level, source_type)
values ('56000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a6',
        '16000000-0000-0000-0000-000000000001', 'recommended', 'post_visit_feedback');

select lives_ok(
  $$ update public.visit_followups
     set answered_at = now(), rating = 'Excellent', recommend = 'Absolument',
         signal_id = '56000000-0000-0000-0000-0000000000a6'
     where id = '66000000-0000-0000-0000-0000000000a6' $$,
  'le retour enregistre le signal de l''utilisateur'
);

select is(
  (select shared_with_circle from public.signals where id = '56000000-0000-0000-0000-0000000000a6'),
  false,
  'un retour n''est pas partagé avec le cercle par défaut'
);

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c6","role":"authenticated"}';
select is(
  (select count(*) from public.signals where id = '56000000-0000-0000-0000-0000000000a6'),
  0::bigint,
  'C ne voit pas le retour de A'
);

select * from finish();
rollback;
