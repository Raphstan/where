-- Page invité en 5 secondes et budget Google à 0 (2026-11-02, après le premier test réel).
--
-- 1. Budget Google mensuel. La page invité cherche le lieu dans Google Places pendant la frappe.
--    Chaque appel Google est compté par mois et par type d'appel (SKU) ; au plafond, l'appli cesse
--    d'appeler Google jusqu'au 1er du mois suivant. Les plafonds, fixés dans src/lib/google/budget.ts,
--    restent sous la part gratuite de Google : la facture reste à 0.
--    Même table que les quotas quotidiens : sujet 'google', action = SKU, jour = 1er du mois (UTC).

create function public.consume_google_budget(p_sku text, p_limit integer)
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
  insert into public.usage_counters (subject, action, day, count)
  values ('google', p_sku, date_trunc('month', now() at time zone 'utc')::date, 1)
  on conflict (subject, action, day) do update
    set count = public.usage_counters.count + 1
    where public.usage_counters.count < p_limit
  returning count into v_count;
  return v_count is not null;
end;
$$;

revoke all on function public.consume_google_budget(text, integer) from public, anon, authenticated;
grant execute on function public.consume_google_budget(text, integer) to service_role;

-- 2. Réponse invité sans « Tu y es réellement allé·e ? ». Le proche cite ses lieux préférés : par
--    défaut, sa réponse est une recommandation, sans visite affirmée (null). Il peut cocher « Je n'y
--    suis pas encore allé·e » (false → saved). true reste pour les réponses antérieures (« Oui »).
alter table public.request_replies
  alter column visited drop not null;

comment on column public.request_replies.visited is
  'true : « Oui, j''y suis allé·e » (anciennes réponses) → recommended + visited ; null : recommandation sans visite affirmée → recommended ; false : « pas encore allé·e » → saved.';
