export type JobStatus = 'scheduled' | 'running' | 'completed' | 'cancelled';

export interface Machine {
  id: string;
  name: string;
  machine_group: 'FCT' | 'ETT';
  capacity: number;
  display_order: number;
  is_down: boolean;
  down_note: string | null;
  down_eta: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestType {
  id: string;
  name: string;
  slug: string;
  default_duration_hours: number;
  color: string;
  concurrent_duration_hours: number | null;
  requires_manual_duration: boolean;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  serial_number: string;
  test_type_id: string;
  machine_id: string;
  lane_index: number;
  start_datetime: string;
  duration_hours: number;
  status: JobStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  test_type?: TestType;
  machine?: Machine;
}

export interface TimeWindow {
  start: Date;
  end: Date;
  mode: 'shift' | 'calendar';
}

export type ViewMode = 'shift' | 'calendar';
