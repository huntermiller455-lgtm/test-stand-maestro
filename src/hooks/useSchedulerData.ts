import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Machine, TestType, Job, JobStatus } from '@/types/scheduler';
import { toast } from 'sonner';

/**
 * Maps database errors to user-friendly messages to prevent information leakage.
 * Keeps technical details in console logs for debugging.
 */
function getErrorMessage(error: unknown, operation: string): string {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
  
  if (errorMessage.includes('foreign key')) {
    return 'Referenced record not found';
  }
  if (errorMessage.includes('duplicate key') || errorMessage.includes('unique')) {
    return 'A record with this value already exists';
  }
  if (errorMessage.includes('check constraint') || errorMessage.includes('violates check')) {
    return 'Invalid input value provided';
  }
  if (errorMessage.includes('row level security') || errorMessage.includes('permission') || errorMessage.includes('policy')) {
    return 'You do not have permission for this operation';
  }
  if (errorMessage.includes('not found') || errorMessage.includes('no rows')) {
    return 'Record not found';
  }
  
  // Generic fallback - never expose raw error
  return `Failed to ${operation}. Please try again.`;
}

/**
 * Sanitizes search input to prevent potential injection and ensure safe pattern matching.
 * - Trims whitespace
 * - Limits length to 100 characters
 * - Returns null if empty after sanitization
 */
function sanitizeSearchInput(search: string | undefined): string | null {
  if (!search) return null;
  const sanitized = search.trim().substring(0, 100);
  return sanitized.length > 0 ? sanitized : null;
}

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
      
      // Sanitize search input before using in query
      const sanitizedSearch = sanitizeSearchInput(filters?.search);
      if (sanitizedSearch) {
        query = query.ilike('serial_number', `%${sanitizedSearch}%`);
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
    mutationFn: async (job: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'test_type' | 'machine' | 'created_by'>) => {
      // Get current user ID for RLS enforcement
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a job');
      
      const { data, error } = await supabase
        .from('jobs')
        .insert({ ...job, created_by: user.id })
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
      // Only log sanitized error messages in development to prevent info leakage
      if (import.meta.env.DEV) {
        console.error('Job creation failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      toast.error(getErrorMessage(error, 'create job'));
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
      // Only log sanitized error messages in development to prevent info leakage
      if (import.meta.env.DEV) {
        console.error('Job update failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      toast.error(getErrorMessage(error, 'update job'));
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
      // Only log sanitized error messages in development to prevent info leakage
      if (import.meta.env.DEV) {
        console.error('Job deletion failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      toast.error(getErrorMessage(error, 'delete job'));
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
      // Only log sanitized error messages in development to prevent info leakage
      if (import.meta.env.DEV) {
        console.error('Machine update failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      toast.error(getErrorMessage(error, 'update machine'));
    },
  });
}
