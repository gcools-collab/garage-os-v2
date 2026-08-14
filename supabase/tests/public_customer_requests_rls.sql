begin;
select plan(3);
select has_function('public', 'create_public_customer_request', array['text','text','text','text','text','text','text','date','text','text','jsonb','text','boolean','boolean','text']);
select table_privs_are('public', 'leads', 'anon', array[]::text[]);
select table_privs_are('public', 'lead_events', 'anon', array[]::text[]);
select * from finish();
rollback;
