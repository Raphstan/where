-- Tests de la demande au réseau (pgTAP). Lancer : npm run db:test
-- Vérifie : une conversation est privée ; une demande ne cite que ses propres conversations ;
-- un destinataire appartient toujours au cercle de l'auteur de la demande.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local');

insert into public.circle_members (id, user_id, name, email) values
  ('21000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Sarah', 's@test.local'),
  ('21000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Proche de C', 'p@test.local');

insert into public.conversations (id, user_id, question) values
  ('31000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Où déjeuner à Zikhron ?'),
  ('31000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Question de C');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is((select count(*) from public.conversations), 1::bigint, 'A ne voit que ses conversations');

select throws_ok(
  $$ insert into public.requests (user_id, conversation_id, question, message)
     values ('00000000-0000-0000-0000-0000000000a1', '31000000-0000-0000-0000-0000000000c1', 'q', 'message') $$,
  '23514',
  null,
  'une demande ne peut pas citer la conversation de quelqu''un d''autre'
);

select lives_ok(
  $$ insert into public.requests (id, user_id, conversation_id, question, message)
     values ('41000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
             '31000000-0000-0000-0000-0000000000a1', 'q', 'message') $$,
  'une demande cite sa propre conversation'
);

select throws_ok(
  $$ insert into public.request_recipients (request_id, circle_member_id)
     values ('41000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-0000000000c1') $$,
  '23514',
  null,
  'un destinataire hors du cercle de l''auteur est refusé'
);

select lives_ok(
  $$ insert into public.request_recipients (request_id, circle_member_id)
     values ('41000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-0000000000a1') $$,
  'un membre du cercle peut être destinataire'
);

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select is((select count(*) from public.request_recipients), 0::bigint, 'C ne voit pas les destinataires de A');

select * from finish();
rollback;
