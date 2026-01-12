-- Create job status enum
CREATE TYPE public.job_status AS ENUM ('scheduled', 'running', 'completed', 'cancelled');

-- Create machines table
CREATE TABLE public.machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  machine_group TEXT NOT NULL CHECK (machine_group IN ('FCT', 'ETT')),
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity IN (1, 2)),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_down BOOLEAN NOT NULL DEFAULT false,
  down_note TEXT,
  down_eta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test types table
CREATE TABLE public.test_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  default_duration_hours DECIMAL(4,2) NOT NULL,
  color TEXT NOT NULL,
  concurrent_duration_hours DECIMAL(4,2),
  requires_manual_duration BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL,
  test_type_id UUID NOT NULL REFERENCES public.test_types(id) ON DELETE RESTRICT,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  lane_index INTEGER NOT NULL DEFAULT 0 CHECK (lane_index IN (0, 1)),
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  status public.job_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_jobs_machine_id ON public.jobs(machine_id);
CREATE INDEX idx_jobs_start_datetime ON public.jobs(start_datetime);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_machines_group ON public.machines(machine_group);

-- Enable RLS on all tables
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read machines and test types (public data)
CREATE POLICY "Anyone can read machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Anyone can read test types" ON public.test_types FOR SELECT USING (true);
CREATE POLICY "Anyone can read jobs" ON public.jobs FOR SELECT USING (true);

-- Allow authenticated users to modify data
CREATE POLICY "Authenticated users can insert machines" ON public.machines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update machines" ON public.machines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert test types" ON public.test_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update test types" ON public.test_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE TO authenticated USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_test_types_updated_at BEFORE UPDATE ON public.test_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed machines data
INSERT INTO public.machines (name, machine_group, capacity, display_order) VALUES
  ('FCT 1', 'FCT', 1, 1),
  ('FCT 2', 'FCT', 1, 2),
  ('FCT 3', 'FCT', 1, 3),
  ('FCT 4', 'FCT', 1, 4),
  ('FCT 5', 'FCT', 1, 5),
  ('FCT 6', 'FCT', 1, 6),
  ('FCT 7', 'FCT', 1, 7),
  ('ETT 1', 'ETT', 1, 8),
  ('ETT 2', 'ETT', 2, 9),
  ('ETT 4', 'ETT', 2, 10);

-- Seed test types data
INSERT INTO public.test_types (name, slug, default_duration_hours, color, concurrent_duration_hours, requires_manual_duration) VALUES
  ('Initial', 'initial', 1.00, 'initial', NULL, false),
  ('1030/1090', '1030-1090', 1.00, '1030-1090', NULL, false),
  ('PWT', 'pwt', 8.00, 'pwt', NULL, false),
  ('RC', 'rc', 12.00, 'rc', NULL, false),
  ('VSWR', 'vswr', 1.00, 'vswr', NULL, false),
  ('BIT', 'bit', 8.00, 'bit', NULL, false),
  ('EMC', 'emc', 3.00, 'emc', NULL, false),
  ('ETT', 'ett', 14.00, 'ett', 20.00, false),
  ('Manual Tune', 'manual', 1.00, 'manual', NULL, true);