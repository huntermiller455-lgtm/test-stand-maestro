-- First update any existing jobs with NULL created_by to have a valid owner
-- This will set them to be owned by the first admin user, or if no admin exists, the first user with a role
UPDATE public.jobs 
SET created_by = (
  SELECT user_id FROM public.user_roles 
  WHERE role = 'admin'::app_role 
  LIMIT 1
)
WHERE created_by IS NULL;

-- If no admin found, set to any user with a role
UPDATE public.jobs 
SET created_by = (
  SELECT user_id FROM public.user_roles 
  LIMIT 1
)
WHERE created_by IS NULL;

-- Now make the column NOT NULL to prevent orphaned jobs in the future
ALTER TABLE public.jobs 
ALTER COLUMN created_by SET NOT NULL;