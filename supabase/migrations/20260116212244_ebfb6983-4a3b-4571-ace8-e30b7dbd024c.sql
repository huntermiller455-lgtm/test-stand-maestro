-- Add DELETE policies for machines and test_types tables (admin only)

-- Allow admins to delete machines
CREATE POLICY "Admins can delete machines"
ON public.machines
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete test types
CREATE POLICY "Admins can delete test types"
ON public.test_types
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));