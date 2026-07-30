begin;
select plan(11);
select policies_are('public', 'copilot_action_logs', array[
  'Users read their private copilot action logs',
  'Users create their private copilot action proposals',
  'Users resolve their private copilot action proposals'
]);
select col_is_pk('public', 'copilot_action_logs', 'id');
select col_has_check('public', 'copilot_action_logs', 'payload');
select col_has_check('public', 'copilot_action_logs', 'target_snapshot');
select has_index('public', 'copilot_action_logs', 'copilot_action_logs_conversation_created_idx');
select has_index('public', 'copilot_action_logs', 'copilot_action_logs_garage_user_status_idx');
select has_trigger('public', 'copilot_action_logs', 'validate_copilot_action_log_trigger');
select table_privs_are('public', 'copilot_action_logs', 'anon', array[]::text[]);
select table_privs_are('public', 'copilot_action_logs', 'authenticated', array['INSERT', 'SELECT', 'UPDATE']);
select fk_ok(
  'public', 'copilot_action_logs', 'copilot_action_conversation_scope_fk',
  'public', 'copilot_conversations'
);
select * from finish();
rollback;
