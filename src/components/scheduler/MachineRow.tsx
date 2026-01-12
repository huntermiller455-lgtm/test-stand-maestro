import { Machine, Job, ViewMode } from '@/types/scheduler';
import { JobBar } from './JobBar';
import { getJobPosition, getTimeWindow, getHoursForMode } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

interface MachineRowProps {
  machine: Machine;
  jobs: Job[];
  currentDate: Date;
  mode: ViewMode;
  onJobClick: (job: Job) => void;
}

interface LaneDropZoneProps {
  machineId: string;
  laneIndex: number;
  children: React.ReactNode;
  isDualCapacity: boolean;
}

function LaneDropZone({ machineId, laneIndex, children, isDualCapacity }: LaneDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${machineId}-lane-${laneIndex}`,
    data: {
      machineId,
      laneIndex,
    },
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'relative',
        isDualCapacity ? 'h-1/2' : 'h-full',
        isOver && 'bg-primary/20'
      )}
    >
      {children}
    </div>
  );
}

export function MachineRow({ machine, jobs, currentDate, mode, onJobClick }: MachineRowProps) {
  const { start: windowStart, end: windowEnd } = getTimeWindow(currentDate, mode);
  
  // Filter jobs for this machine
  const machineJobs = jobs.filter(job => job.machine_id === machine.id);
  
  // Separate jobs by lane for dual-capacity machines
  const lane0Jobs = machineJobs.filter(job => job.lane_index === 0);
  const lane1Jobs = machineJobs.filter(job => job.lane_index === 1);
  
  const isDualCapacity = machine.capacity === 2;
  const rowHeight = isDualCapacity ? 'h-24' : 'h-14';
  const hours = getHoursForMode(mode);

  return (
    <div className={cn(
      'machine-row flex',
      rowHeight,
      machine.is_down && 'machine-row-down'
    )}>
      {/* Machine label */}
      <div className={cn(
        'machine-label w-32 flex-shrink-0 border-r border-border',
        machine.is_down && 'text-destructive'
      )}>
        <div className={cn(
          'status-dot',
          machine.is_down ? 'status-down' : 'status-operational'
        )} />
        <span>{machine.name}</span>
        {machine.is_down && (
          <span className="text-xs text-destructive ml-1">DOWN</span>
        )}
      </div>
      
      {/* Timeline area */}
      <div className="flex-1 relative">
        {/* Hour grid lines */}
        <div className="absolute inset-0 flex">
          {hours.map((hour, index) => (
            <div 
              key={`${hour}-${index}`} 
              className="flex-1 border-r border-grid-line"
            />
          ))}
        </div>

        {isDualCapacity && <div className="lane-divider" />}
        
        {/* Lane 0 */}
        <LaneDropZone machineId={machine.id} laneIndex={0} isDualCapacity={isDualCapacity}>
          {lane0Jobs.map(job => {
            const position = getJobPosition(
              new Date(job.start_datetime),
              job.duration_hours,
              windowStart,
              windowEnd
            );
            
            return position.segments.map((segment, idx) => (
              <JobBar
                key={`${job.id}-${idx}`}
                job={job}
                leftPercent={segment.leftPercent}
                widthPercent={segment.widthPercent}
                onClick={() => onJobClick(job)}
              />
            ));
          })}
        </LaneDropZone>
        
        {/* Lane 1 (only for dual-capacity machines) */}
        {isDualCapacity && (
          <LaneDropZone machineId={machine.id} laneIndex={1} isDualCapacity={isDualCapacity}>
            {lane1Jobs.map(job => {
              const position = getJobPosition(
                new Date(job.start_datetime),
                job.duration_hours,
                windowStart,
                windowEnd
              );
              
              return position.segments.map((segment, idx) => (
                <JobBar
                  key={`${job.id}-${idx}`}
                  job={job}
                  leftPercent={segment.leftPercent}
                  widthPercent={segment.widthPercent}
                  onClick={() => onJobClick(job)}
                />
              ));
            })}
          </LaneDropZone>
        )}
      </div>
    </div>
  );
}
