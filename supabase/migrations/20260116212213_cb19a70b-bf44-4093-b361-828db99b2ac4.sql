-- Fix RLS policies to use explicit auth check instead of 'true'

-- Drop and recreate test_types read policy with explicit auth check
DROP POLICY IF EXISTS "Authenticated users can read test types" ON public.test_types;
CREATE POLICY "Authenticated users can read test types"
ON public.test_types
FOR SELECT
USING (auth.role() = 'authenticated');

-- Drop and recreate machines read policy with explicit auth check
DROP POLICY IF EXISTS "Authenticated users can read machines" ON public.machines;
CREATE POLICY "Authenticated users can read machines"
ON public.machines
FOR SELECT
USING (auth.role() = 'authenticated');

-- Drop and recreate jobs read policy with explicit auth check
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON public.jobs;
CREATE POLICY "Authenticated users can read jobs"
ON public.jobs
FOR SELECT
USING (auth.role() = 'authenticated');