-- WHERE · demande au réseau (ticket 5)
-- 1. conversations : la question et ses critères, pour retrouver une conversation quand un proche
--    répond (CLAUDE.md § 6.6). Les messages ne sont pas stockés : les résultats sont recalculés.
-- 2. requests.conversation_id : la demande au réseau appartient à une conversation.
-- 3. request_replies.place_url : lien Google Maps / Instagram / TikTok donné par le proche.
-- 4. Un destinataire est toujours un membre du cercle de l'auteur de la demande.

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question text not null,
  criteria jsonb not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_question_not_blank check (length(trim(question)) > 0),
  constraint conversations_criteria_object check (jsonb_typeof(criteria) = 'object')
);

comment on table public.conversations is 'Une question posée dans le chat, avec les critères compris (forme de src/lib/ask/schema.ts). Privée.';
comment on column public.conversations.tags is 'Chips de critères affichées, après retraits et ajouts manuels.';

create index conversations_user_id_idx on public.conversations (user_id, created_at desc);

alter table public.conversations enable row level security;

create policy "conversations: tout accès par le propriétaire"
  on public.conversations for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- requests · rattachées à une conversation
-- ---------------------------------------------------------------------------

alter table public.requests
  add column conversation_id uuid references public.conversations (id) on delete set null;

create index requests_conversation_id_idx on public.requests (conversation_id);

-- La conversation citée appartient à l'auteur de la demande.
create function public.check_request_conversation_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.conversation_id is not null and not exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id and c.user_id = new.user_id
  ) then
    raise exception 'La conversation n''appartient pas à l''auteur de la demande.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_request_conversation_owner() from public, anon, authenticated;

create trigger requests_conversation_owner
  before insert or update of conversation_id, user_id on public.requests
  for each row execute function public.check_request_conversation_owner();

-- ---------------------------------------------------------------------------
-- request_recipients · uniquement des membres du cercle de l'auteur
-- ---------------------------------------------------------------------------

create function public.check_recipient_in_circle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

revoke execute on function public.check_recipient_in_circle() from public, anon, authenticated;

create trigger request_recipients_in_circle
  before insert or update of request_id, circle_member_id on public.request_recipients
  for each row execute function public.check_recipient_in_circle();

-- ---------------------------------------------------------------------------
-- request_replies · lien éventuel donné par le proche
-- ---------------------------------------------------------------------------

alter table public.request_replies
  add column place_url text,
  add constraint request_replies_place_url_http
    check (place_url is null or place_url ~* '^https?://');

comment on column public.request_replies.place_url is 'Lien Google Maps, Instagram ou TikTok donné par le proche (facultatif).';
