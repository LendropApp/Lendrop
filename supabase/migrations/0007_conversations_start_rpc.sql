-- 0007_conversations_start_rpc.sql
-- Fase 2: makes real messaging possible from the client.
--
-- ── WHAT WAS MISSING ──────────────────────────────────────────────────
-- supabase_setup.sql already has conversations/conversation_participants/
-- messages tables with SELECT policies for participants, but no INSERT
-- policy on conversations or conversation_participants — only a service
-- role could ever create one. That's fine for messages themselves
-- (messages_insert_participant already lets a participant post), but a
-- renter has no way to start a conversation with a lender in the first
-- place.
--
-- Two-row participant inserts (me + the other person) can't be safely
-- opened up with plain RLS policies: Postgres evaluates WITH CHECK per
-- row against the snapshot at the start of the statement, so a policy
-- like "allow if I'm already a participant of this conversation" can't
-- see the sibling row being inserted in the same statement. The
-- standard fix (and what's used here) is a SECURITY DEFINER RPC that
-- does the whole "find-or-create" atomically, the same pattern already
-- used by handle_new_user() for signup.
--
-- Also adds `item_id` to conversations: reservation_id alone can't
-- represent a "message the lender about this listing" conversation
-- started before Fase 3 reservations exist, since it's the only way to
-- know which listing a pre-reservation conversation is about.
-- ════════════════════════════════════════════════════════════════════

alter table public.conversations
  add column item_id uuid references public.items(id) on delete set null;

create index conversations_item_idx on public.conversations(item_id);

create or replace function public.start_conversation(
  other_user_id uuid,
  p_item_id uuid default null,
  p_reservation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  if other_user_id is null or other_user_id = auth.uid() then
    raise exception 'Invalid conversation participant';
  end if;

  select c.id into existing_id
  from public.conversations c
  join public.conversation_participants me on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_participants them on them.conversation_id = c.id and them.user_id = other_user_id
  where c.item_id is not distinct from p_item_id
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (item_id, reservation_id)
  values (p_item_id, p_reservation_id)
  returning id into new_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (new_id, auth.uid()), (new_id, other_user_id);

  return new_id;
end;
$$;

comment on function public.start_conversation is 'Find-or-create a conversation between the caller and other_user_id, optionally scoped to an item. Runs as SECURITY DEFINER so it can insert both participant rows atomically — see file header for why plain RLS policies can''t do this safely.';

grant execute on function public.start_conversation(uuid, uuid, uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN 0007
-- ════════════════════════════════════════════════════════════════════
