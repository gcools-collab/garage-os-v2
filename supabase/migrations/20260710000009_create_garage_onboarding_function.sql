create or replace function public.create_garage_onboarding(
  garage_name text
)

returns uuid

language plpgsql

security definer

set search_path = public

as $$

declare

  new_garage_id uuid;

begin


  insert into public.garages(name)

  values (garage_name)

  returning id into new_garage_id;



  insert into public.garage_members(

    garage_id,

    user_id,

    role

  )

  values (

    new_garage_id,

    auth.uid(),

    'owner'

  );


  return new_garage_id;


end;

$$;


grant execute on function public.create_garage_onboarding(text)
to authenticated;