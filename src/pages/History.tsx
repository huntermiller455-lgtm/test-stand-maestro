import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMachines, useTestTypes, useAllJobs, useCreateJob } from '@/hooks/useSchedulerData';
import { useAuth } from '@/hooks/useAuth';
import { UserMenu } from '@/components/auth/UserMenu';
import { JobStatus } from '@/types/scheduler';
import { ArrowLeft, Search, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusColors: Record<JobStatus, string> = {
  scheduled: 'bg-status-scheduled text-primary-foreground',
  running: 'bg-status-running text-primary-foreground',
  completed: 'bg-status-completed text-primary-foreground',
  cancelled: 'bg-status-cancelled text-white',
};

export default function History() {
  const { user, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all');

  const { data: machines = [] } = useMachines();
  const { data: testTypes = [] } = useTestTypes();
  const { data: jobs = [], isLoading } = useAllJobs({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    machine_id: machineFilter !== 'all' ? machineFilter : undefined,
    test_type_id: testTypeFilter !== 'all' ? testTypeFilter : undefined,
    search: search || undefined,
  });

  const createJob = useCreateJob();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  function handleDuplicate(job: typeof jobs[0]) {
    createJob.mutate({
      serial_number: job.serial_number + ' (copy)',
      test_type_id: job.test_type_id,
      machine_id: job.machine_id,
      lane_index: job.lane_index,
      start_datetime: new Date().toISOString(),
      duration_hours: job.duration_hours,
      status: 'scheduled',
      notes: job.notes,
      created_by: null,
    });
    toast.success('Job duplicated');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Job History</h1>
        </div>
        <UserMenu />
      </header>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={machineFilter} onValueChange={setMachineFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Machines</SelectItem>
              {machines.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={testTypeFilter} onValueChange={setTestTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Test Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {testTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Serial Number</TableHead>
                <TableHead>Test Type</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono font-medium">{job.serial_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3 h-3 rounded', `test-bar-${job.test_type?.slug || 'manual'}`)} />
                        {job.test_type?.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>{job.machine?.name || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(job.start_datetime), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-mono">{job.duration_hours}h</TableCell>
                    <TableCell>
                      <Badge className={cn('capitalize', statusColors[job.status])}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {job.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(job)}
                        title="Duplicate job"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}