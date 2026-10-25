-- Tests de l'import par transfert d'email (pgTAP). Lancer : npm run db:test
-- Vérifie : chaque compte a son adresse de transfert, privée et non modifiable ; un email transféré
-- est privé ; seul le webhook (service_role) l'écrit ; l'utilisateur ne change que la qualification,
-- une seule fois ; une livraison ou une annulation n'est jamais à qualifier.
begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a7', 'a7@test.local'),
  ('00000000-0000-0000-0000-0000000000c7', 'c7@test.local');

select is(
  (select count(*) from public.forward_addresses where user_id in ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c7')),
  2::bigint,
  'chaque compte reçoit une adresse de transfert'
);

-- Le webhook (ici le rôle propriétaire, comme service_role) écrit les emails.
insert into public.forwarded_emails (id, user_id, resend_email_id, from_address, body_text, received_at, kind, platform, place_name, status) values
  ('77000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a7', 'r-a1', 'a7@test.local', 'Table', now(), 'table', 'Tabit', 'Fantastic', 'pending'),
  ('77000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a7', 'r-a2', 'a7@test.local', 'Livraison', now(), 'delivery', 'Tabit', 'Pizza Lola', 'excluded'),
  ('77000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c7', 'r-c1', 'c7@test.local', 'Table', now(), 'table', 'Tabit', 'MILA', 'pending');

select throws_ok(
  $$ insert into public.forwarded_emails (user_id, resend_email_id, from_address, body_text, received_at, kind, place_name, status)
     values ('00000000-0000-0000-0000-0000000000a7', 'r-x', 'a7@test.local', 'x', now(), 'delivery', 'Miznon', 'pending') $$,
  '23514',
  null,
  'une livraison n''est jamais en attente de qualification'
);

select throws_ok(
  $$ insert into public.forwarded_emails (user_id, resend_email_id, from_address, body_text, received_at, kind, status)
     values ('00000000-0000-0000-0000-0000000000a7', 'r-y', 'a7@test.local', 'x', now(), 'table', 'pending') $$,
  '23514',
  null,
  'une réservation porte toujours le nom du lieu'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}';

select is((select count(*) from public.forward_addresses), 1::bigint, 'A ne voit que sa propre adresse');
select is((select count(*) from public.forwarded_emails), 2::bigint, 'A ne voit que ses emails');

-- Le jeton n'est jamais modifiable par l'utilisateur (aucun droit de mise à jour).
select throws_ok(
  $$ update public.forward_addresses set token = 'aaaaaaaaaaaaaaaa' $$,
  '42501',
  null,
  'A ne choisit pas son jeton'
);

select throws_ok(
  $$ insert into public.forwarded_emails (user_id, resend_email_id, from_address, body_text, received_at, kind, place_name, status)
     values ('00000000-0000-0000-0000-0000000000a7', 'r-z', 'a7@test.local', 'x', now(), 'table', 'Faux', 'pending') $$,
  '42501',
  null,
  'A ne peut pas fabriquer un email transféré'
);

select throws_ok(
  $$ update public.forwarded_emails set kind = 'table', status = 'pending' where id = '77000000-0000-0000-0000-0000000000a2' $$,
  '42501',
  null,
  'A ne peut pas changer une livraison en réservation'
);

update public.forwarded_emails set status = 'skipped' where id = '77000000-0000-0000-0000-0000000000c1';

select throws_ok(
  $$ update public.forwarded_emails set status = 'qualified', visited = 'Non', recommend = 'Absolument', qualified_at = now()
     where id = '77000000-0000-0000-0000-0000000000a1' $$,
  '23514',
  null,
  'sans visite, pas de recommandation'
);

select lives_ok(
  $$ update public.forwarded_emails set status = 'qualified', visited = 'Oui', recommend = 'Absolument', occasion = '{date}', qualified_at = now()
     where id = '77000000-0000-0000-0000-0000000000a1' $$,
  'A qualifie sa réservation'
);

select throws_ok(
  $$ update public.forwarded_emails set status = 'pending', visited = null, recommend = null, qualified_at = null
     where id = '77000000-0000-0000-0000-0000000000a1' $$,
  '23514',
  null,
  'une réservation qualifiée ne repasse pas en attente'
);

select throws_ok(
  $$ update public.forwarded_emails set visited = 'Je ne sais plus', recommend = null, occasion = '{}'
     where id = '77000000-0000-0000-0000-0000000000a1' $$,
  '23514',
  null,
  'une qualification ne se réécrit pas'
);

reset role;
select is(
  (select status::text from public.forwarded_emails where id = '77000000-0000-0000-0000-0000000000c1'),
  'pending',
  'A ne peut pas qualifier l''email de C'
);

select * from finish();
rollback;
