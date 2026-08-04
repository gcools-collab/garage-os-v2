begin;
select plan(8);
select has_table('public', 'garage_services');
select has_view('public', 'public_live_garage_services');
select policies_are('public', 'garage_services', array[
  'Garage members read service configuration',
  'Garage admins create service configuration',
  'Garage admins update service configuration',
  'Garage admins delete service configuration'
]);
select col_is_pk('public', 'garage_services', 'id');
select col_not_null('public', 'garage_services', 'garage_id');
select col_not_null('public', 'garage_services', 'service_key');
select col_not_null('public', 'garage_services', 'is_enabled');
select col_not_null('public', 'garage_services', 'display_order');
select * from finish();
rollback;
