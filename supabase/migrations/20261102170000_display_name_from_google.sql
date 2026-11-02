-- Prénom du demandeur (2026-11-02). Il s'affiche sur la page de ses proches (« Raphaël aimerait
-- connaître tes adresses préférées »). Jusqu'ici, personne ne le remplissait : le lien magique ne le
-- demande pas, et Google le range dans given_name / full_name / name, pas dans display_name.
-- Résultat au premier test : « la personne qui te demande », sans prénom.

-- 1. Prénom à l'inscription : display_name, sinon le prénom Google, sinon le premier mot du nom.
create or replace function public.first_name_from_meta(meta jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(trim(coalesce(
    nullif(trim(meta ->> 'display_name'), ''),
    nullif(trim(meta ->> 'given_name'), ''),
    split_part(trim(coalesce(nullif(trim(meta ->> 'full_name'), ''), meta ->> 'name', '')), ' ', 1)
  )), 60), '');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, public.first_name_from_meta(new.raw_user_meta_data))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Rattrapage des comptes existants sans prénom : métadonnées du compte, puis identités Google.
update public.users u
set display_name = coalesce(
  public.first_name_from_meta(a.raw_user_meta_data),
  (
    select public.first_name_from_meta(i.identity_data)
    from auth.identities i
    where i.user_id = a.id and i.provider = 'google'
    limit 1
  )
)
from auth.users a
where a.id = u.id
  and coalesce(trim(u.display_name), '') = '';
