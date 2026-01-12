import { Machine, Job, ViewMode } from '@/types/scheduler';
import { JobBar } from './JobBar';
import { getJobPosition, getTimeWindow } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface MachineRowProps {
  machine: Machine;
  jobs: Job[];
  currentDate: Date;
  mode: ViewMode;
  onJobClick: (job: Job) => void;
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
      <div className="flex-1 relative time-grid">
        {isDualCapacity && <div className="lane-divider" />}
        
        {/* Lane 0 jobs */}
        <div className={cn('relative', isDualCapacity ? 'h-1/2' : 'h-full')}>
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
        </div>
        
        {/* Lane 1 jobs (only for dual-capacity machines) */}
        {isDualCapacity && (
          <div className="relative h-1/2">
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
          </div>
        )}
      </div>
    </div>
  );
}
