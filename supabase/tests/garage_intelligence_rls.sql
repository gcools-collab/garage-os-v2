begin;

select plan(12);

select has_table('public', 'intelligence_recommendations', 'recommendations table exists');
select col_is_pk('public', 'intelligence_recommendations', 'id', 'recommendation id is primary key');
select is(
  (select relrowsecurity from pg_class where oid = 'public.intelligence_recommendations'::regclass),
  true,
  'recommendation RLS enabled'
);
select policies_are(
  'public',
  'intelligence_recommendations',
  array[
    'Garage admins can delete intelligence recommendations',
    'Garage members can create intelligence recommendations',
    'Garage members can read intelligence recommendations',
    'Garage members can update intelligence recommendations'
  ],
  'recommendation policies remain tenant scoped'
);
select has_trigger(
  'public',
  'intelligence_recommendations',
  'prevent_intelligence_recommendation_tenant_change_trigger',
  'tenant changes are blocked'
);
select has_trigger(
  'public',
  'intelligence_recommendations',
  'set_intelligence_recommendation_updated_at_trigger',
  'updated_at remains automatic'
);
select col_has_check(
  'public', 'intelligence_recommendations', 'payload',
  'payload is constrained'
);
select col_has_check(
  'public', 'intelligence_recommendations', 'score',
  'score is constrained'
);
select col_is_unique(
  'public', 'intelligence_recommendations', array['garage_id', 'recommendation_key'],
  'key is unique inside one garage'
);
select isnt_definer(
  'public',
  'prevent_intelligence_recommendation_tenant_change',
  array[]::text[],
  'tenant trigger has no elevated privileges'
);
select table_privs_are(
  'public', 'intelligence_recommendations', 'anon', array[]::text[],
  'anonymous users have no recommendation privileges'
);
select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'intelligence_recommendations'
      and (qual = 'true' or with_check = 'true')
  ),
  0,
  'no permissive true policy exists'
);

select * from finish();
rollback;
