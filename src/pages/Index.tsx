import { useAuth } from '@/hooks/useAuth';
import { SchedulerBoard } from '@/components/scheduler/SchedulerBoard';
import { LoginForm } from '@/components/auth/LoginForm';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <SchedulerBoard />;
};

export default Index;