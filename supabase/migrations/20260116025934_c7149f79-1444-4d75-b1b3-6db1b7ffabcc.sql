-- Fix PUBLIC_DATA_EXPOSURE: Require authentication for reads
-- Drop public read policies
DROP POLICY IF EXISTS "Anyone can read machines" ON public.machines;
DROP POLICY IF EXISTS "Anyone can read test types" ON public.test_types;
DROP POLICY IF EXISTS "Anyone can read jobs" ON public.jobs;

-- Create authenticated-only read policies
CREATE POLICY "Authenticated users can read machines"
ON public.machines 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read test types"
ON public.test_types 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read jobs"
ON public.jobs 
FOR SELECT 
TO authenticated
USING (true);

-- Fix MISSING_RLS: Restrict job mutations
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;

-- Create role-based policies for job mutations
-- Only admins can delete jobs (to protect historical records)
CREATE POLICY "Admins can delete jobs"
ON public.jobs 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert jobs (with created_by enforcement)
CREATE POLICY "Authenticated users can insert jobs"
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can update their own jobs OR admins can update any job
CREATE POLICY "Users can update own jobs or admins any"
ON public.jobs 
FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- Restrict machine updates to admins only (currently too permissive)
DROP POLICY IF EXISTS "Authenticated users can update machines" ON public.machines;

CREATE POLICY "Admins can update machines"
ON public.machines 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix INPUT_VALIDATION: Add database constraints
-- Duration hours must be positive and reasonable (max 30 days = 720 hours)
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_duration_hours_check 
CHECK (duration_hours > 0 AND duration_hours <= 720);

-- Serial number length limit
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_serial_number_length 
CHECK (length(serial_number) <= 100 AND length(serial_number) > 0);

-- Notes length limit
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_notes_length 
CHECK (notes IS NULL OR length(notes) <= 1000);

-- Machine down_note length limit
ALTER TABLE public.machines
ADD CONSTRAINT machines_down_note_length 
CHECK (down_note IS NULL OR length(down_note) <= 500);