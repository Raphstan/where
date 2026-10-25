-- WHERE · recherche et classement (ticket 4)
-- 1. Attributs des lieux décrits dans CLAUDE.md § 6.6 et affichés sur les cartes résultat :
--    quartier/zone, type, ambiance, niveau sonore, prix.
-- 2. Filtrage par cercle garanti par la base : un signal attribué à un proche ne peut citer
--    qu'un membre du cercle de son propriétaire.

-- ---------------------------------------------------------------------------
-- places · attributs affichés et utilisés pour le classement
-- ---------------------------------------------------------------------------

alter table public.places
  add column area text,
  add column kind text,
  add column vibe text[] not null default '{}',
  add column noise text,
  add column price text;

comment on column public.places.area is 'Quartier ou zone, ex. « Jaffa · Marché aux puces ».';
comment on column public.places.kind is 'Type de lieu en clair, ex. « Bar-restaurant », « Hôtel boutique ».';
comment on column public.places.vibe is 'Ambiance, ex. {intime, artistique}.';
comment on column public.places.noise is 'Niveau sonore en clair, ex. « Modéré avant 22 h ».';
comment on column public.places.price is 'Gamme de prix telle qu''affichée, ex. « ₪₪₪ ».';

-- ---------------------------------------------------------------------------
-- signals · le proche cité appartient au cercle du propriétaire
-- ---------------------------------------------------------------------------

create function public.check_signal_member_in_circle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_member_id is not null and not exists (
    select 1 from public.circle_members cm
    where cm.id = new.source_member_id and cm.user_id = new.user_id
  ) then
    raise exception 'Le proche cité n''appartient pas au cercle du propriétaire du signal.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_signal_member_in_circle() from public, anon, authenticated;

create trigger signals_member_in_circle
  before insert or update of source_member_id, user_id on public.signals
  for each row execute function public.check_signal_member_in_circle();
