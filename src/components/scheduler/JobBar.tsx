import { Job, TestType } from '@/types/scheduler';
import { cn } from '@/lib/utils';

interface JobBarProps {
  job: Job;
  leftPercent: number;
  widthPercent: number;
  onClick?: () => void;
  isDragging?: boolean;
}

const colorClassMap: Record<string, string> = {
  'initial': 'test-bar-initial',
  '1030-1090': 'test-bar-1030-1090',
  'pwt': 'test-bar-pwt',
  'rc': 'test-bar-rc',
  'vswr': 'test-bar-vswr',
  'bit': 'test-bar-bit',
  'emc': 'test-bar-emc',
  'ett': 'test-bar-ett',
  'manual': 'test-bar-manual',
};

export function JobBar({ job, leftPercent, widthPercent, onClick, isDragging }: JobBarProps) {
  const colorClass = job.test_type?.color ? colorClassMap[job.test_type.color] : 'test-bar-manual';
  
  const statusIndicator = job.status === 'running' 
    ? '▶ ' 
    : job.status === 'completed' 
    ? '✓ ' 
    : '';

  return (
    <div
      className={cn(
        'test-bar absolute h-10 min-w-[60px] px-2 text-xs',
        colorClass,
        isDragging && 'opacity-70 scale-105',
        job.status === 'cancelled' && 'opacity-50 line-through',
        job.status === 'running' && 'ring-2 ring-white/50'
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 2)}%`,
        top: '4px',
      }}
      onClick={onClick}
      title={`${job.serial_number} - ${job.test_type?.name || 'Unknown'} (${job.duration_hours}h)`}
    >
      <span className="truncate">
        {statusIndicator}{job.serial_number}
      </span>
    </div>
  );
}
