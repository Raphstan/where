-- Mémoire de démonstration (développement local uniquement), reprise de docs/prototype.html.
-- Crée le cercle de la maquette (Sarah, Noam, Maya, David), quelques lieux de Tel Aviv et leurs signaux
-- pour le compte dont l'email est passé en variable.
--
--   docker exec -i supabase_db_where psql -U postgres -v email="'toi@exemple.com'" < supabase/snippets/demo_memory.sql
--
-- Relançable : les données de démo du compte sont d'abord supprimées.

begin;

create temp table demo_user on commit drop as
  select id from public.users where email = :email;

do $$ begin
  if not exists (select 1 from demo_user) then
    raise exception 'Aucun compte avec cet email : connecte-toi une première fois sur /login.';
  end if;
end $$;

delete from public.signals where user_id = (select id from demo_user);
delete from public.circle_members where user_id = (select id from demo_user) and email like '%@demo.where';
delete from public.places where id::text like 'e0000000-0000-0000-0000-%';

insert into public.circle_members (id, user_id, name, email, relation, trust_domains)
select v.id::uuid, (select id from demo_user), v.name, v.email, v.relation, v.domains::public.trust_domain[]
from (values
  ('d0000000-0000-0000-0000-000000000001', 'Sarah', 'sarah@demo.where', 'Amie proche', '{restaurants,hotels}'),
  ('d0000000-0000-0000-0000-000000000002', 'Noam', 'noam@demo.where', 'Ami', '{nightlife}'),
  ('d0000000-0000-0000-0000-000000000003', 'Maya', 'maya@demo.where', 'Collègue', '{restaurants,activities}'),
  ('d0000000-0000-0000-0000-000000000004', 'David', 'david@demo.where', 'Frère', '{travel,family,activities}')
) as v(id, name, email, relation, domains);

insert into public.places (id, name, city, area, kind, vibe, noise, price)
values
  ('e0000000-0000-0000-0000-000000000001', 'Beit Kandinof', 'Tel Aviv', 'Jaffa · Marché aux puces', 'Restaurant & galerie', '{intime,artistique,caché}', 'Modéré avant 22 h', '₪₪₪'),
  ('e0000000-0000-0000-0000-000000000002', 'Herzl 16', 'Tel Aviv', 'Centre · Rue Herzl', 'Bar-restaurant', '{chaleureux,musical}', 'Animé', '₪₪'),
  ('e0000000-0000-0000-0000-000000000003', 'Café Nahat', 'Tel Aviv', 'Neve Tzedek', 'Café', '{calme,"bois clair"}', 'Calme le matin', '₪'),
  ('e0000000-0000-0000-0000-000000000004', 'Dallal Bakery', 'Tel Aviv', 'Neve Tzedek', 'Boulangerie-café', '{vivant}', 'Animé le week-end', '₪₪'),
  ('e0000000-0000-0000-0000-000000000005', 'Spicehaus', 'Tel Aviv', 'Dizengoff', 'Bar à cocktails', '{feutré,cuivre}', 'Variable', '₪₪₪'),
  ('e0000000-0000-0000-0000-000000000006', 'Hotel de’ Ricci', 'Rome', 'Campo de’ Fiori', 'Hôtel boutique', '{intime,romantique}', 'Calme', '€€€');

insert into public.signals (user_id, place_id, source_member_id, evidence_level, occasion, note, source_type, created_at)
select (select id from demo_user), v.place::uuid, v.member::uuid, v.level::public.evidence_level, v.occasion::text[], v.note,
       v.source::public.signal_source_type, now() - v.age::interval
from (values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'recommended', '{date}', null, 'network_reply', '3 weeks'),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'visited', '{date,calme}', 'On peut parler tranquillement avant 22 h', 'network_reply', '2 months'),
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'visited', '{amis}', null, 'network_reply', '5 months'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'saved', '{}', null, 'link_share', '1 month'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004', 'booked', '{}', null, 'email_forward', '4 months'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'recommended', '{travail}', null, 'network_reply', '1 week'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'visited', '{travail}', null, 'network_reply', '1 week'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'recommended', '{travail}', null, 'network_reply', '3 years 2 months'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'recommended', '{date,calme}', null, 'network_reply', '2 months'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'visited', '{amis}', 'bruyant après 22 h, DJ le jeudi', 'network_reply', '1 month'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000001', 'recommended', '{"séjour à deux"}', null, 'network_reply', '5 months'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'booked', '{}', null, 'email_forward', '1 year')
) as v(place, member, level, occasion, note, source, age);

commit;
