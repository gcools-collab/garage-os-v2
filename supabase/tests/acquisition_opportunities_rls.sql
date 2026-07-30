begin;
select plan(8);

select has_table('public', 'acquisition_opportunities', 'opportunities table exists');
select has_table('public', 'acquisition_sellers', 'sellers table exists');
select has_table('public', 'acquisition_documents', 'documents table exists');
select row_security_active('public.acquisition_opportunities');
select row_security_active('public.acquisition_sellers');
select row_security_active('public.acquisition_documents');
select has_index('public', 'acquisition_opportunities', 'acquisition_opportunities_garage_status_idx');
select has_check('public', 'acquisition_opportunities', 'opportunity values are constrained');

select * from finish();
rollback;
