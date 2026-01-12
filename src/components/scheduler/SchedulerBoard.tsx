import { useState, useMemo } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { TimeHeader } from './TimeHeader';
import { MachineRow } from './MachineRow';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { AddJobModal } from './AddJobModal';
import { MachineStatusPanel } from './MachineStatusPanel';
import { useMachines, useTestTypes, useJobs, useCreateJob, useUpdateJob, useDeleteJob, useUpdateMachine } from '@/hooks/useSchedulerData';
import { getTimeWindow } from '@/lib/timeUtils';
import { Job, ViewMode } from '@/types/scheduler';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, List } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export function SchedulerBoard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('shift');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: testTypes = [], isLoading: testTypesLoading } = useTestTypes();
  
  const { start: windowStart, end: windowEnd } = getTimeWindow(currentDate, viewMode);
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    subDays(windowStart, 1), // Fetch a bit earlier for wrap-around jobs
    addDays(windowEnd, 1)
  );

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const updateMachine = useUpdateMachine();

  const isLoading = machinesLoading || testTypesLoading || jobsLoading;

  // Filter jobs that fall within the current window
  const visibleJobs = useMemo(() => {
    return jobs.filter(job => {
      const jobStart = new Date(job.start_datetime);
      const jobEnd = new Date(jobStart.getTime() + job.duration_hours * 60 * 60 * 1000);
      return jobEnd > windowStart && jobStart < windowEnd;
    });
  }, [jobs, windowStart, windowEnd]);

  function handleJobClick(job: Job) {
    setSelectedJob(job);
    setModalOpen(true);
  }

  function handleAddJob() {
    setSelectedJob(null);
    setModalOpen(true);
  }

  function handleSaveJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'test_type' | 'machine'>) {
    if (selectedJob) {
      updateJob.mutate({ id: selectedJob.id, ...jobData });
    } else {
      createJob.mutate(jobData);
    }
  }

  function handleDeleteJob(id: string) {
    deleteJob.mutate(id);
  }

  function handleUpdateMachine(update: { id: string; is_down: boolean; down_note?: string | null }) {
    updateMachine.mutate(update);
  }

  const dateDisplay = format(currentDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">Test Stand Scheduler</h1>
          
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(d => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-mono text-sm px-3 py-1.5 bg-muted rounded-md min-w-[240px] text-center">
              {dateDisplay}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(d => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant={viewMode === 'shift' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('shift')}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              Shift (6-6)
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="gap-1"
            >
              <Calendar className="h-3 w-3" />
              Calendar
            </Button>
          </div>

          <MachineStatusPanel machines={machines} onUpdateMachine={handleUpdateMachine} />

          <Link to="/history">
            <Button variant="outline" size="sm" className="gap-2">
              <List className="h-4 w-4" />
              History
            </Button>
          </Link>

          <Button onClick={handleAddJob} className="gap-2 btn-industrial">
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="relative">
            <CurrentTimeIndicator currentDate={currentDate} mode={viewMode} />
            <TimeHeader mode={viewMode} />
            
            {machines.map(machine => (
              <MachineRow
                key={machine.id}
                machine={machine}
                jobs={visibleJobs}
                currentDate={currentDate}
                mode={viewMode}
                onJobClick={handleJobClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <footer className="bg-card border-t border-border px-4 py-2 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Test Types:</span>
        {testTypes.map(type => (
          <div key={type.id} className="flex items-center gap-1.5">
            <div className={`w-4 h-3 rounded test-bar-${type.slug}`} />
            <span className="text-xs">{type.name}</span>
          </div>
        ))}
      </footer>

      <AddJobModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        machines={machines}
        testTypes={testTypes}
        existingJob={selectedJob}
        onSave={handleSaveJob}
        onDelete={handleDeleteJob}
      />
    </div>
  );
}
