-- Les 4 chiffres de la bêta (lecture seule). Lancé par `npm run beta:metrics`.
-- Comptes de test exclus : adresses avec « + » (raphael+test@…).
with
u as (
  select id, created_at from public.users where email not like '%+%'
),
-- 1. Les proches répondent-ils ? Questions envoyées (au moins un lien ouvert) ayant au moins une réponse.
asked as (
  select r.id, bool_or(rr.replied_at is not null) as answered
  from public.requests r
  join u on u.id = r.user_id
  join public.request_recipients rr on rr.request_id = r.id
  where rr.sent_at is not null
  group by r.id
),
-- 2. Les gens reviennent-ils ? Comptes de plus de 14 jours ayant posé une question entre J+7 et J+14.
week2 as (
  select u.id,
         exists (
           select 1 from public.conversations c
           where c.user_id = u.id
             and c.created_at >= u.created_at + interval '7 days'
             and c.created_at <  u.created_at + interval '14 days'
         ) as returned
  from u
  where u.created_at <= now() - interval '14 days'
),
-- 3. Les invités deviennent-ils utilisateurs ? Proches ayant répondu, puis gardé leur mémoire (compte relié).
guests as (
  select distinct cm.id, cm.member_id is not null as joined
  from public.request_recipients rr
  join public.requests r on r.id = rr.request_id
  join u on u.id = r.user_id
  join public.circle_members cm on cm.id = rr.circle_member_id
  where rr.replied_at is not null
),
-- 4. La mémoire se remplit-elle ? Lieux distincts par compte, aujourd'hui.
mem as (
  select u.id, count(distinct s.place_id) as places
  from u left join public.signals s on s.user_id = u.id
  group by u.id
)
select
  (select count(*) from u) as comptes,
  (select count(*) from public.conversations c join u on u.id = c.user_id) as questions,
  (select count(*) from public.conversations c join u on u.id = c.user_id where c.created_at > now() - interval '7 days') as questions_7j,
  (select count(*) from asked) as demandes_envoyees,
  (select round(100.0 * count(*) filter (where answered) / nullif(count(*), 0)) from asked) as pct_demandes_repondues,
  (select count(*) from week2) as comptes_14j,
  (select round(100.0 * count(*) filter (where returned) / nullif(count(*), 0)) from week2) as pct_revenus_semaine2,
  (select count(*) from guests) as proches_ayant_repondu,
  (select round(100.0 * count(*) filter (where joined) / nullif(count(*), 0)) from guests) as pct_proches_inscrits,
  (select round(avg(places), 1) from mem) as lieux_par_compte;
