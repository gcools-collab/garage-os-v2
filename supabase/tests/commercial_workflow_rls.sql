begin;

select plan(18);

select has_table('public', 'commercial_tasks', 'commercial_tasks exists');
select has_table('public', 'lead_notes', 'lead_notes exists');
select has_table('public', 'notifications', 'notifications exists');
select col_is_pk('public', 'commercial_tasks', 'id', 'commercial task id is primary key');
select col_is_pk('public', 'lead_notes', 'id', 'lead note id is primary key');
select col_is_pk('public', 'notifications', 'id', 'notification id is primary key');
select is(
  (select relrowsecurity from pg_class where oid = 'public.commercial_tasks'::regclass),
  true,
  'commercial task RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.lead_notes'::regclass),
  true,
  'lead note RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  true,
  'notification RLS enabled'
);
select policies_are(
  'public',
  'commercial_tasks',
  array[
    'Garage members can create commercial tasks',
    'Garage members can read commercial tasks',
    'Garage members can update commercial tasks'
  ],
  'commercial task policies remain tenant scoped'
);
select policies_are(
  'public',
  'lead_notes',
  array[
    'Authors and admins can update lead notes',
    'Garage members can create lead notes',
    'Garage members can read lead notes'
  ],
  'lead note policies remain tenant scoped'
);
select policies_are(
  'public',
  'notifications',
  array[
    'Garage members can create notifications',
    'Garage members can read visible notifications',
    'Users can update visible notifications'
  ],
  'notification policies remain tenant scoped'
);
select has_trigger(
  'public', 'commercial_tasks', 'validate_commercial_task_scope_trigger',
  'commercial tasks validate tenant relationships'
);
select has_trigger(
  'public', 'lead_notes', 'validate_lead_note_scope_trigger',
  'lead notes validate tenant relationships'
);
select has_trigger(
  'public', 'notifications', 'validate_notification_scope_trigger',
  'notifications validate tenant recipients'
);
select function_privs_are(
  'public',
  'create_public_vehicle_lead',
  array[
    'text', 'text', 'lead_type', 'text', 'text', 'text', 'date',
    'text', 'text', 'text', 'boolean', 'boolean', 'text'
  ],
  'anon',
  array['EXECUTE'],
  'anonymous users can only call the constrained lead RPC'
);
select isnt_definer(
  'public',
  'validate_commercial_task_scope',
  array[]::text[],
  'tenant validation trigger is invoker security'
);
select isnt_definer(
  'public',
  'validate_notification_scope',
  array[]::text[],
  'notification validation trigger is invoker security'
);

select * from finish();
rollback;
