import { Job, Machine } from '@/types/scheduler';
import { differenceInMinutes, addMinutes } from 'date-fns';

interface ConflictResult {
  hasConflict: boolean;
  conflictingJobs: Job[];
  message?: string;
}

export function checkJobConflict(
  newJob: {
    machine_id: string;
    lane_index: number;
    start_datetime: Date;
    duration_hours: number;
    id?: string; // Exclude self when editing
  },
  existingJobs: Job[],
  machines: Machine[]
): ConflictResult {
  const machine = machines.find(m => m.id === newJob.machine_id);
  if (!machine) {
    return { hasConflict: true, conflictingJobs: [], message: 'Machine not found' };
  }

  const newJobStart = newJob.start_datetime;
  const newJobEnd = addMinutes(newJobStart, newJob.duration_hours * 60);

  // Filter jobs on the same machine
  const machineJobs = existingJobs.filter(job => 
    job.machine_id === newJob.machine_id && 
    job.id !== newJob.id && // Exclude self
    job.status !== 'cancelled' && 
    job.status !== 'completed'
  );

  if (machine.capacity === 1) {
    // Single capacity - no overlapping allowed
    const conflictingJobs = machineJobs.filter(job => {
      const jobStart = new Date(job.start_datetime);
      const jobEnd = addMinutes(jobStart, job.duration_hours * 60);
      return jobStart < newJobEnd && jobEnd > newJobStart;
    });

    if (conflictingJobs.length > 0) {
      return {
        hasConflict: true,
        conflictingJobs,
        message: `${machine.name} can only run one job at a time. Conflicts with: ${conflictingJobs.map(j => j.serial_number).join(', ')}`
      };
    }
  } else {
    // Dual capacity - check lane conflicts
    const laneJobs = machineJobs.filter(job => job.lane_index === newJob.lane_index);
    
    const conflictingJobs = laneJobs.filter(job => {
      const jobStart = new Date(job.start_datetime);
      const jobEnd = addMinutes(jobStart, job.duration_hours * 60);
      return jobStart < newJobEnd && jobEnd > newJobStart;
    });

    if (conflictingJobs.length > 0) {
      return {
        hasConflict: true,
        conflictingJobs,
        message: `Lane ${newJob.lane_index + 1} already has a job during this time. Conflicts with: ${conflictingJobs.map(j => j.serial_number).join(', ')}`
      };
    }

    // Also check if trying to schedule more than 2 concurrent jobs
    const allLaneJobs = machineJobs.filter(job => {
      const jobStart = new Date(job.start_datetime);
      const jobEnd = addMinutes(jobStart, job.duration_hours * 60);
      return jobStart < newJobEnd && jobEnd > newJobStart;
    });

    if (allLaneJobs.length >= 2) {
      return {
        hasConflict: true,
        conflictingJobs: allLaneJobs,
        message: `${machine.name} can only run 2 jobs concurrently. Both lanes are occupied.`
      };
    }
  }

  return { hasConflict: false, conflictingJobs: [] };
}

export function findAvailableLane(
  machineId: string,
  startTime: Date,
  durationHours: number,
  existingJobs: Job[],
  machines: Machine[],
  excludeJobId?: string
): number | null {
  const machine = machines.find(m => m.id === machineId);
  if (!machine) return null;

  if (machine.capacity === 1) {
    // Check if single lane is available
    const conflict = checkJobConflict(
      { machine_id: machineId, lane_index: 0, start_datetime: startTime, duration_hours: durationHours, id: excludeJobId },
      existingJobs,
      machines
    );
    return conflict.hasConflict ? null : 0;
  }

  // Try lane 0 first
  const lane0Conflict = checkJobConflict(
    { machine_id: machineId, lane_index: 0, start_datetime: startTime, duration_hours: durationHours, id: excludeJobId },
    existingJobs,
    machines
  );
  if (!lane0Conflict.hasConflict) return 0;

  // Try lane 1
  const lane1Conflict = checkJobConflict(
    { machine_id: machineId, lane_index: 1, start_datetime: startTime, duration_hours: durationHours, id: excludeJobId },
    existingJobs,
    machines
  );
  if (!lane1Conflict.hasConflict) return 1;

  return null;
}
