begin;
select plan(12);

select policies_are('public', 'copilot_conversations', array[
  'Users manage their private copilot conversations',
  'Users create their private copilot conversations',
  'Users update their private copilot conversations'
]);
select policies_are('public', 'copilot_messages', array[
  'Users read messages from their private copilot conversations',
  'Users create messages in their private copilot conversations'
]);
select col_is_pk('public', 'copilot_conversations', 'id');
select col_is_pk('public', 'copilot_messages', 'id');
select col_has_check('public', 'copilot_messages', 'content');
select col_has_check('public', 'copilot_messages', 'structured_payload');
select has_index('public', 'copilot_conversations', 'copilot_conversations_user_recent_idx');
select has_index('public', 'copilot_messages', 'copilot_messages_conversation_created_idx');
select has_trigger('public', 'copilot_conversations', 'validate_copilot_conversation_scope_trigger');
select has_trigger('public', 'copilot_messages', 'validate_copilot_message_scope_trigger');
select table_privs_are('public', 'copilot_conversations', 'anon', array[]::text[]);
select table_privs_are('public', 'copilot_messages', 'anon', array[]::text[]);

select * from finish();
rollback;
