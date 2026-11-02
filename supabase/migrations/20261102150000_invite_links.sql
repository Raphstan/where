-- Lien d'invitation (2026-11-02), sur le modèle de Happenstance : « Inviter sur WhatsApp » ouvre
-- WhatsApp avec un message prêt et un lien privé ; l'utilisateur choisit lui-même le contact.
-- On ne sait donc pas encore QUI répondra : le proche du cercle est créé à sa réponse, avec le
-- prénom qu'il donne.
--
-- 1. requests.kind : 'question' (demande liée à une conversation) ou 'invite' (adresses préférées).
-- 2. request_recipients.circle_member_id devient facultatif : vide tant que l'invité n'a pas répondu.
-- 3. circle_members : un proche arrivé par un lien d'invitation n'a ni téléphone ni email connus.
--    On pourra quand même lui écrire : wa.me sans numéro laisse choisir le contact dans WhatsApp.

alter table public.requests
  add column kind text not null default 'question'
    constraint requests_kind_valid check (kind in ('question', 'invite'));

alter table public.request_recipients
  alter column circle_member_id drop not null;

alter table public.circle_members
  drop constraint circle_members_reachable;

-- 4. Un destinataire sans proche n'est admis que pour une invitation ; sinon, même règle qu'avant.
create or replace function public.check_recipient_in_circle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.circle_member_id is null then
    if exists (select 1 from public.requests r where r.id = new.request_id and r.kind = 'invite') then
      return new;
    end if;
    raise exception 'Un destinataire sans proche n''est admis que pour une invitation.'
      using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.requests r
    join public.circle_members cm on cm.user_id = r.user_id
    where r.id = new.request_id and cm.id = new.circle_member_id
  ) then
    raise exception 'Le destinataire n''appartient pas au cercle de l''auteur de la demande.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
