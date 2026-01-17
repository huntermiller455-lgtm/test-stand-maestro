-- Drop the existing overly permissive SELECT policy on jobs
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON public.jobs;

-- Create a new restrictive policy that only allows users to see their own jobs or admins to see all
CREATE POLICY "Users can read own jobs or admins all"
ON public.jobs
FOR SELECT
USING (
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::app_role)
);