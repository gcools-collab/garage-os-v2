-- Vérifications en lecture seule après application de la migration garage_branding.

-- La table doit avoir la RLS activée.
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname = 'garage_branding';

-- Les policies attendues doivent cibler les rôles authenticated.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'garage_branding'
order by policyname;

-- Le bucket public sert les logos et favicons de Garage OS Live.
-- L'écriture reste limitée par les policies storage.objects.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'garage-branding';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname ilike '%branding%'
order by policyname;
