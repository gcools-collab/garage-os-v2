begin;
select plan(4);
select has_table('public','registration_cases','registration cases exists');
select has_table('public','registration_documents','registration documents exists');
select policies_are('public','registration_cases',array['Members read registration cases','Members update registration cases'],'case policies are explicit');
select isnt((select public from storage.buckets where id='registration-documents'),true,'registration bucket is private');
select * from finish();
rollback;
