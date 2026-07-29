-- Diagnostic en lecture seule à exécuter avec un rôle d'administration Supabase.
-- Ce script ne crée, ne modifie et ne supprime aucune donnée.

-- Garages et nombre de membres.
select
  g.id,
  g.name,
  g.created_at,
  count(gm.id) as member_count
from public.garages g
left join public.garage_members gm on gm.garage_id = g.id
group by g.id, g.name, g.created_at
order by g.created_at, g.name;

-- Profils et appartenances.
select
  p.id as user_id,
  p.full_name,
  gm.garage_id,
  g.name as garage_name,
  gm.role
from public.profiles p
left join public.garage_members gm on gm.user_id = p.id
left join public.garages g on g.id = gm.garage_id
order by p.id, g.name;

-- Utilisateurs authentifiés sans appartenance.
select
  u.id as user_id,
  u.email,
  u.created_at
from auth.users u
left join public.garage_members gm on gm.user_id = u.id
where gm.id is null
order by u.created_at;

-- Doublons probables de garage par nom normalisé.
select
  lower(regexp_replace(trim(name), '\s+', ' ', 'g')) as normalized_name,
  count(*) as garage_count,
  array_agg(id order by created_at) as garage_ids
from public.garages
group by lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
having count(*) > 1
order by garage_count desc, normalized_name;
