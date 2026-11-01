-- Tests de la bêta privée (pgTAP). Lancer : npm run db:test
-- Vérifie : la liste des invités est invisible et non modifiable pour un utilisateur connecté ou
-- anonyme ; les emails y sont en minuscules.
begin;
select plan(5);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'b1@test.local');
insert into public.beta_access (email, note) values ('invite@test.local', 'famille');

select throws_ok(
  $$ insert into public.beta_access (email) values ('Majuscule@Test.local') $$,
  '23514', null, 'un email invité est toujours en minuscules'
);

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is((select count(*) from public.beta_access)::int, 0, 'un utilisateur connecté ne voit aucun invité');
select throws_ok(
  $$ insert into public.beta_access (email) values ('moi@test.local') $$,
  '42501', null, 'un utilisateur connecté ne peut pas s''inviter lui-même'
);

reset role;
set local role anon;
select is((select count(*) from public.beta_access)::int, 0, 'un visiteur anonyme ne voit aucun invité');
select throws_ok(
  $$ insert into public.beta_access (email) values ('anon@test.local') $$,
  '42501', null, 'un visiteur anonyme ne peut pas s''inviter'
);

select * from finish();
rollback;
