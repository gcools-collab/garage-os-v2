begin;
select plan(17);

select has_table('public', 'acquisition_opportunities', 'opportunities table exists');
select has_table('public', 'acquisition_sellers', 'sellers table exists');
select has_table('public', 'acquisition_documents', 'documents table exists');
select row_security_active('public.acquisition_opportunities');
select row_security_active('public.acquisition_sellers');
select row_security_active('public.acquisition_documents');
select has_index('public', 'acquisition_opportunities', 'acquisition_opportunities_garage_status_idx');
select has_check('public', 'acquisition_opportunities', 'opportunity values are constrained');

select has_policy(
  'storage', 'objects', 'Garage members upload acquisition documents',
  'acquisition document upload policy exists'
);

select ok(
  (select with_check from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'Garage members upload acquisition documents')
    like '%array_length(storage.foldername(name), 1) = 2%',
  'authorized path has exactly garage and opportunity folders'
);

select ok(
  (select with_check from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'Garage members upload acquisition documents')
    like '%gm.user_id = auth.uid()%'
    and (select with_check from pg_policies
         where schemaname = 'storage' and tablename = 'objects'
           and policyname = 'Garage members upload acquisition documents')
      like '%ao.id::text = (storage.foldername(name))[2]%',
  'upload requires current membership and the scoped opportunity'
);

select ok(
  (select with_check from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname = 'Garage members upload acquisition documents')
    like '%bucket_id = ''acquisition-documents''%',
  'other buckets remain forbidden by this policy'
);

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'go0097-member@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'go0097-outsider@example.invalid');

insert into public.profiles (id, full_name)
values
  ('10000000-0000-4000-8000-000000000001', 'GO-0097 member'),
  ('10000000-0000-4000-8000-000000000002', 'GO-0097 outsider');

insert into public.garages (id, name)
values
  ('20000000-0000-4000-8000-000000000001', 'GO-0097 garage one'),
  ('20000000-0000-4000-8000-000000000002', 'GO-0097 garage two');

insert into public.garage_members (garage_id, user_id, role)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'member');

insert into public.acquisition_sellers
  (id, garage_id, created_by_user_id, type, name)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'PRIVATE', 'Seller one');

-- The second fixture bypasses the actor trigger only for test setup: the tested
-- boundary remains the storage policy, and every change is rolled back.
update public.garage_members
set garage_id = '20000000-0000-4000-8000-000000000002'
where user_id = '10000000-0000-4000-8000-000000000001';

insert into public.acquisition_sellers
  (id, garage_id, created_by_user_id, type, name)
values ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'PRIVATE', 'Seller two');

insert into public.acquisition_opportunities
  (id, garage_id, creator_user_id, seller_id, provenance, brand, model)
values
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'OTHER', 'Test', 'Foreign');

update public.garage_members
set garage_id = '20000000-0000-4000-8000-000000000001'
where user_id = '10000000-0000-4000-8000-000000000001';

insert into public.acquisition_opportunities
  (id, garage_id, creator_user_id, seller_id, provenance, brand, model)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'OTHER', 'Test', 'Allowed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('acquisition-documents', '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/allowed.jpg')$$,
  'member can upload into the matching garage and opportunity path'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('acquisition-documents', '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000002/foreign.jpg')$$,
  '42501', null,
  'member cannot upload into an opportunity from another garage'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('acquisition-documents', '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/extra/too-deep.jpg')$$,
  '42501', null,
  'member cannot upload a path with an unexpected folder depth'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('vehicle-images', '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/wrong-bucket.jpg')$$,
  '42501', null,
  'acquisition policy cannot authorize another bucket'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values
    ('acquisition-documents', '20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/outsider.jpg')$$,
  '42501', null,
  'non-member cannot upload into an existing opportunity'
);

select * from finish();
rollback;
