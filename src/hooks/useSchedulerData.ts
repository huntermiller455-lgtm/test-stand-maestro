import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Machine, TestType, Job, JobStatus } from '@/types/scheduler';
import { toast } from 'sonner';

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Machine[];
    },
  });
}

export function useTestTypes() {
  return useQuery({
    queryKey: ['test_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as TestType[];
    },
  });
}

export function useJobs(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['jobs', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          test_type:test_types(*),
          machine:machines(*)
        `)
        .gte('start_datetime', startDate.toISOString())
        .lte('start_datetime', endDate.toISOString())
        .order('start_datetime');
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useAllJobs(filters?: {
  status?: JobStatus;
  machine_id?: string;
  test_type_id?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['jobs', 'all', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          test_type:test_types(*),
          machine:machines(*)
        `)
        .order('start_datetime', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.machine_id) {
        query = query.eq('machine_id', filters.machine_id);
      }
      if (filters?.test_type_id) {
        query = query.eq('test_type_id', filters.test_type_id);
      }
      if (filters?.search) {
        query = query.ilike('serial_number', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Job[];
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'test_type' | 'machine'>) => {
      const { data, error } = await supabase
        .from('jobs')
        .insert(job)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create job: ' + error.message);
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Job> & { id: string }) => {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update job: ' + error.message);
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete job: ' + error.message);
    },
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Machine> & { id: string }) => {
      const { data, error } = await supabase
        .from('machines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine status updated');
    },
    onError: (error) => {
      toast.error('Failed to update machine: ' + error.message);
    },
  });
}
