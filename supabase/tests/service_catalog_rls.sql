begin;select plan(8);
select has_table('public','service_offers');select has_table('public','service_offer_options');
select row_security_active('public','service_offers');select row_security_active('public','service_offer_options');
select has_column('public','appointments','commercial_snapshot');select has_column('public','appointments','offer_id');
select has_view('public','public_live_service_offers');select has_view('public','public_live_service_offer_options');
select * from finish();rollback;
