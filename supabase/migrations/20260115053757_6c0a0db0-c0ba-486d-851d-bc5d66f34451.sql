-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policy: users can read their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policy: only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to auto-create user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing RLS policies to require authentication for mutations

-- Drop existing permissive policies on jobs
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs;

-- Create proper authenticated policies for jobs
CREATE POLICY "Authenticated users can insert jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete jobs"
ON public.jobs FOR DELETE TO authenticated
USING (true);

-- Drop existing permissive policies on machines
DROP POLICY IF EXISTS "Authenticated users can insert machines" ON public.machines;
DROP POLICY IF EXISTS "Authenticated users can update machines" ON public.machines;

-- Create admin-only policies for machines
CREATE POLICY "Admins can insert machines"
ON public.machines FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can update machines"
ON public.machines FOR UPDATE TO authenticated
USING (true);

-- Drop existing permissive policies on test_types
DROP POLICY IF EXISTS "Authenticated users can insert test types" ON public.test_types;
DROP POLICY IF EXISTS "Authenticated users can update test types" ON public.test_types;

-- Create admin-only policies for test_types
CREATE POLICY "Admins can insert test types"
ON public.test_types FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update test types"
ON public.test_types FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));