-- Tests du transfert par filtre Gmail (pgTAP). Lancer : npm run db:test
-- Vérifie : le code de confirmation n'est écrit que par le webhook (service_role), lu seulement par
-- le propriétaire de l'adresse, et toujours au bon format.
begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a9', 'a9@test.local'),
  ('00000000-0000-0000-0000-0000000000c9', 'c9@test.local');

-- Le webhook (ici le rôle propriétaire, comme service_role) garde le code reçu pour A.
update public.forward_addresses
  set gmail_confirmation_code = '170012345', gmail_confirmation_from = 'a9@gmail.com', gmail_confirmation_at = now()
  where user_id = '00000000-0000-0000-0000-0000000000a9';

select throws_ok(
  $$ update public.forward_addresses set gmail_confirmation_code = 'abc', gmail_confirmation_at = now()
     where user_id = '00000000-0000-0000-0000-0000000000c9' $$,
  '23514',
  null,
  'un code de confirmation est fait de chiffres'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000c9","role":"authenticated"}';

select is(
  (select count(*) from public.forward_addresses where gmail_confirmation_code is not null),
  0::bigint,
  'C ne voit pas le code de A'
);
select throws_ok(
  $$ update public.forward_addresses set gmail_confirmation_code = '999999999', gmail_confirmation_at = now() $$,
  '42501',
  null,
  'C ne peut pas écrire de code de confirmation'
);

set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000a9","role":"authenticated"}';
select is(
  (select gmail_confirmation_code from public.forward_addresses),
  '170012345',
  'A lit son code pour le recopier dans Gmail'
);

select * from finish();
rollback;
