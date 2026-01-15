import { useState, useMemo, useRef, useCallback } from 'react';
import { format, addDays, subDays, addMinutes, differenceInMinutes } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors, DragMoveEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { TimeHeader } from './TimeHeader';
import { MachineRow } from './MachineRow';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import { AddJobModal } from './AddJobModal';
import { MachineStatusPanel } from './MachineStatusPanel';
import { JobBarGhost } from './JobBar';
import { useMachines, useTestTypes, useJobs, useCreateJob, useUpdateJob, useDeleteJob, useUpdateMachine } from '@/hooks/useSchedulerData';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';
import { getTimeWindow, getTimeFromPosition } from '@/lib/timeUtils';
import { checkJobConflict, findAvailableLane } from '@/lib/conflictDetection';
import { Job, ViewMode } from '@/types/scheduler';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, List, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function SchedulerBoard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('shift');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ machineId: string; laneIndex: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const { data: machines = [], isLoading: machinesLoading } = useMachines();
  const { data: testTypes = [], isLoading: testTypesLoading } = useTestTypes();
  
  const { start: windowStart, end: windowEnd } = getTimeWindow(currentDate, viewMode);
  const { data: jobs = [], isLoading: jobsLoading } = useJobs(
    subDays(windowStart, 1),
    addDays(windowEnd, 1)
  );

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const updateMachine = useUpdateMachine();

  // Enable realtime updates for jobs
  useRealtimeJobs();

  const isLoading = machinesLoading || testTypesLoading || jobsLoading;

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

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
    // Check for conflicts before saving
    const conflict = checkJobConflict(
      {
        machine_id: jobData.machine_id,
        lane_index: jobData.lane_index,
        start_datetime: new Date(jobData.start_datetime),
        duration_hours: jobData.duration_hours,
        id: selectedJob?.id,
      },
      jobs,
      machines
    );

    if (conflict.hasConflict) {
      toast.error(conflict.message || 'Schedule conflict detected');
      return;
    }

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const job = visibleJobs.find(j => j.id === event.active.id);
    if (job) {
      setActiveJob(job);
    }
  }, [visibleJobs]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveJob(null);
    setDragOverInfo(null);

    const { active, over, delta } = event;
    
    if (!over || !active) return;

    const job = visibleJobs.find(j => j.id === active.id);
    if (!job) return;

    // Parse drop target
    const overIdString = String(over.id);
    const [targetMachineId, , targetLaneStr] = overIdString.split('-lane-');
    const isLaneDrop = overIdString.includes('-lane-');
    
    if (!isLaneDrop) return;

    const targetLane = parseInt(targetLaneStr);
    const targetMachine = machines.find(m => m.id === targetMachineId);
    
    if (!targetMachine) return;

    // Calculate new start time based on horizontal drag distance
    const boardElement = boardRef.current;
    if (!boardElement) return;

    const timelineWidth = boardElement.clientWidth - 128; // Subtract machine label width
    const windowMinutes = differenceInMinutes(windowEnd, windowStart);
    const minutesMoved = (delta.x / timelineWidth) * windowMinutes;
    
    // Round to nearest 15 minutes
    const roundedMinutes = Math.round(minutesMoved / 15) * 15;
    const newStartTime = addMinutes(new Date(job.start_datetime), roundedMinutes);

    // Check if anything actually changed
    const machineChanged = targetMachineId !== job.machine_id;
    const laneChanged = targetLane !== job.lane_index;
    const timeChanged = roundedMinutes !== 0;

    if (!machineChanged && !laneChanged && !timeChanged) return;

    // Check for conflicts
    const conflict = checkJobConflict(
      {
        machine_id: targetMachineId,
        lane_index: targetLane,
        start_datetime: newStartTime,
        duration_hours: job.duration_hours,
        id: job.id,
      },
      jobs,
      machines
    );

    if (conflict.hasConflict) {
      toast.error(conflict.message || 'Cannot move job here - conflict detected');
      return;
    }

    // Warn if machine is down
    if (targetMachine.is_down) {
      toast.warning(`Warning: ${targetMachine.name} is currently down`);
    }

    // Update the job
    updateJob.mutate({
      id: job.id,
      machine_id: targetMachineId,
      lane_index: targetLane,
      start_datetime: newStartTime.toISOString(),
    });

    toast.success(`Moved ${job.serial_number} to ${targetMachine.name}${targetMachine.capacity > 1 ? ` Lane ${targetLane + 1}` : ''}`);
  }, [visibleJobs, machines, jobs, windowStart, windowEnd, updateJob]);

  const dateDisplay = format(currentDate, 'EEEE, MMMM d, yyyy');

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">Test Stand Scheduler</h1>
            
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
        <div className="flex-1 overflow-auto relative" ref={boardRef}>
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

        {/* Drag overlay */}
        <DragOverlay>
          {activeJob ? (
            <div className="pointer-events-none">
              <JobBarGhost 
                job={activeJob} 
                style={{ 
                  width: '150px',
                  opacity: 0.9,
                }} 
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Legend */}
        <footer className="bg-card border-t border-border px-4 py-2 flex items-center gap-4 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Test Types:</span>
          {testTypes.map(type => (
            <div key={type.id} className="flex items-center gap-1.5">
              <div className={`w-4 h-3 rounded test-bar-${type.slug}`} />
              <span className="text-xs">{type.name}</span>
            </div>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            Drag jobs to reschedule • Drop zones highlight on hover
          </span>
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
    </DndContext>
  );
}
