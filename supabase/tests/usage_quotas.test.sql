-- Tests des limites d'usage (pgTAP). Lancer : npm run db:test
begin;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local');

-- Serveur (service_role contourne RLS ; ici, rôle propriétaire)
select ok(public.consume_quota('token:abc', 'guest_reply', 2), '1re réponse acceptée');
select ok(public.consume_quota('token:abc', 'guest_reply', 2), '2e réponse acceptée');
select ok(not public.consume_quota('token:abc', 'guest_reply', 2), '3e réponse refusée au-delà du plafond');
select is((select count from public.usage_counters where subject = 'token:abc'), 2, 'un refus ne consomme rien');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select ok(public.consume_my_quota('ask', 1), 'un utilisateur consomme son propre quota');
select ok(not public.consume_my_quota('ask', 1), 'puis il est bloqué');
select throws_ok($$ select public.consume_quota('user:00000000-0000-0000-0000-0000000000e2', 'ask', 0) $$, '42501', null,
  'un utilisateur ne peut pas consommer le quota d''un autre');
select is((select count(*) from public.usage_counters)::int, 0, 'les compteurs sont invisibles pour un utilisateur');

select * from finish();
rollback;
