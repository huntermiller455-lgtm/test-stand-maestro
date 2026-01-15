import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRealtimeJobs() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
        },
        (payload) => {
          // Invalidate all job queries to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          
          // Show subtle notification for external changes
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            toast.info('New job added by another user', { duration: 2000 });
          } else if (eventType === 'UPDATE') {
            toast.info('Job updated by another user', { duration: 2000 });
          } else if (eventType === 'DELETE') {
            toast.info('Job removed by another user', { duration: 2000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
