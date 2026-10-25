-- WHERE · mémoire, cercle, sources et confidentialité (ticket 8)
-- 1. circle_members.description : « Restaurants romantiques et hôtels » (maquette PEOPLE.desc).
-- 2. users : les trois interrupteurs « Utilisé pour les recommandations » (scrPrivacy).
-- 3. forward_addresses : supprimer la source (l'adresse disparaît, les emails reçus avec) et la
--    rétablir avec un nouveau jeton, toujours tiré par la base.
-- 4. delete_imported_places() : « Supprimer tous les lieux importés ».
-- 5. delete_my_account() : « Supprimer mon compte », sans clé service_role.

-- ---------------------------------------------------------------------------
-- circle_members · description libre
-- ---------------------------------------------------------------------------

alter table public.circle_members
  add column description text,
  add constraint circle_members_description_size check (description is null or length(description) <= 200),
  add constraint circle_members_relation_size check (relation is null or length(relation) <= 60),
  add constraint circle_members_name_size check (length(name) <= 60);

comment on column public.circle_members.description is 'Ce pour quoi on lui fait confiance, en clair, ex. « Bars, nightlife et nouveaux lieux ».';

-- ---------------------------------------------------------------------------
-- users · ce qui sert aux recommandations
-- ---------------------------------------------------------------------------

alter table public.users
  add column use_imported_bookings boolean not null default true,
  add column use_visit_feedback boolean not null default true,
  add column use_circle_replies boolean not null default true;

comment on column public.users.use_imported_bookings is 'Maquette : « Mes réservations importées ». false : les signaux importés restent en mémoire mais ne servent plus aux recommandations.';
comment on column public.users.use_visit_feedback is 'Maquette : « Mes retours après visite ».';
comment on column public.users.use_circle_replies is 'Maquette : « Les réponses de mon cercle (avec leur accord) ».';

-- ---------------------------------------------------------------------------
-- forward_addresses · supprimer et rétablir la source
-- ---------------------------------------------------------------------------

create policy "forward_addresses: création par le propriétaire"
  on public.forward_addresses for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "forward_addresses: suppression par le propriétaire"
  on public.forward_addresses for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- L'utilisateur ne choisit jamais son jeton : seule la colonne user_id est insérable.
revoke insert, update on public.forward_addresses from anon, authenticated;
grant insert (user_id) on public.forward_addresses to authenticated;

-- ---------------------------------------------------------------------------
-- « Supprimer tous les lieux importés »
-- ---------------------------------------------------------------------------

-- Lieux importés : ceux qu'un email transféré a fait entrer dans la mémoire (la réservation et sa
-- qualification). Les recommandations manuelles, les retours après visite et les réponses du cercle
-- ne sont pas importés.
create function public.imported_places_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct s.place_id)::integer
  from public.signals s
  where s.user_id = (select auth.uid())
    and s.source_member_id is null
    and s.source_type in ('email_forward', 'qualification');
$$;

-- Supprime les signaux importés et les emails transférés eux-mêmes. Sous RLS (security invoker) :
-- on ne peut supprimer que ses propres données. Retourne le nombre de lieux retirés.
create function public.delete_imported_places()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed integer;
begin
  select public.imported_places_count() into removed;
  delete from public.signals s
  where s.user_id = (select auth.uid())
    and s.source_member_id is null
    and s.source_type in ('email_forward', 'qualification');
  delete from public.forwarded_emails e where e.user_id = (select auth.uid());
  return removed;
end;
$$;

revoke execute on function public.imported_places_count() from public, anon;
revoke execute on function public.delete_imported_places() from public, anon;
grant execute on function public.imported_places_count() to authenticated;
grant execute on function public.delete_imported_places() to authenticated;

-- ---------------------------------------------------------------------------
-- « Supprimer mon compte »
-- ---------------------------------------------------------------------------

-- Supprime l'utilisateur d'auth.users : la cascade emporte public.users et toutes ses données
-- (cercle, signaux, conversations, demandes, suivis, adresse et emails transférés). Les lieux qu'il a
-- créés restent, sans auteur (places.created_by → null), comme ses réponses déjà données à d'autres.
-- security definer : seul moyen, sans clé service_role, de toucher auth.users ; la fonction ne vise
-- jamais que auth.uid().
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Connecte-toi pour continuer.' using errcode = '42501';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
