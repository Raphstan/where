-- Inviter des personnes à la bêta privée (SQL Editor de Supabase, ou psql en local).
-- Les emails sont en minuscules ; rejouer la commande ne crée pas de doublon.
insert into public.beta_access (email, note) values
  ('prenom@exemple.com', 'waitlist')
on conflict (email) do nothing;

-- Qui est invité, et qui a déjà créé son compte :
-- select b.email, b.note, b.invited_at, (u.id is not null) as a_un_compte
-- from public.beta_access b left join public.users u on u.email = b.email
-- order by b.invited_at;
