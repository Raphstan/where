-- ---------------------------------------------------------------------------
-- Limites d'usage par jour : protègent la facture (Claude, Google Places) et la page invité
-- contre un abus ou un bug qui boucle. Compteur Postgres, sans service externe.
-- ---------------------------------------------------------------------------

create table public.usage_counters (
  subject text not null,
  action text not null,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (subject, action, day),
  constraint usage_counters_count_positive check (count >= 0)
);

comment on table public.usage_counters is 'Compteurs quotidiens par sujet (user:{uuid}, token:{jeton}, inbox:{jeton}) et par action. Écrits seulement par consume_quota ; aucune policy.';

alter table public.usage_counters enable row level security;
-- Pas de policy : lecture et écriture uniquement par les fonctions ci-dessous (security definer).

/*
 * Consomme une unité du quota du jour, atomiquement. Renvoie false (sans rien consommer) si le
 * plafond est atteint. Réservée au serveur (service_role).
 */
create function public.consume_quota(p_subject text, p_action text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit <= 0 then
    return false;
  end if;
  insert into public.usage_counters (subject, action, count)
  values (p_subject, p_action, 1)
  on conflict (subject, action, day) do update
    set count = public.usage_counters.count + 1
    where public.usage_counters.count < p_limit
  returning count into v_count;
  return v_count is not null;
end;
$$;

revoke all on function public.consume_quota(text, text, integer) from public, anon, authenticated;
grant execute on function public.consume_quota(text, text, integer) to service_role;

/*
 * Variante pour l'utilisateur connecté : le sujet est toujours son propre identifiant, il ne peut
 * consommer que son propre quota (au pire, il se bloque lui-même).
 */
create function public.consume_my_quota(p_action text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return false;
  end if;
  return public.consume_quota('user:' || (select auth.uid())::text, p_action, p_limit);
end;
$$;

revoke all on function public.consume_my_quota(text, integer) from public, anon;
grant execute on function public.consume_my_quota(text, integer) to authenticated;
