import { Job, TestType } from '@/types/scheduler';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface JobBarProps {
  job: Job;
  leftPercent: number;
  widthPercent: number;
  onClick?: () => void;
  isDragging?: boolean;
  laneOffset?: number;
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

export function JobBar({ job, leftPercent, widthPercent, onClick, laneOffset = 0 }: JobBarProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: {
      job,
      leftPercent,
      widthPercent,
    },
  });

  const colorClass = job.test_type?.color ? colorClassMap[job.test_type.color] : 'test-bar-manual';
  
  const statusIndicator = job.status === 'running' 
    ? '▶ ' 
    : job.status === 'completed' 
    ? '✓ ' 
    : '';

  const style = {
    left: `${leftPercent}%`,
    width: `${Math.max(widthPercent, 2)}%`,
    top: `${4 + laneOffset}px`,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 50 : 10,
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'test-bar absolute h-10 min-w-[60px] px-2 text-xs select-none',
        colorClass,
        isDragging && 'opacity-80 shadow-2xl ring-2 ring-white/30 scale-105',
        job.status === 'cancelled' && 'opacity-50 line-through',
        job.status === 'running' && 'ring-2 ring-white/50'
      )}
      style={style}
      onClick={(e) => {
        if (!isDragging) {
          onClick?.();
        }
      }}
      title={`${job.serial_number} - ${job.test_type?.name || 'Unknown'} (${job.duration_hours}h)\nDrag to move`}
    >
      <div 
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="truncate pl-4">
        {statusIndicator}{job.serial_number}
      </span>
    </div>
  );
}

// Ghost preview while dragging
export function JobBarGhost({ job, style }: { job: Job; style: React.CSSProperties }) {
  const colorClass = job.test_type?.color ? colorClassMap[job.test_type.color] : 'test-bar-manual';

  return (
    <div
      className={cn(
        'test-bar h-10 min-w-[60px] px-2 text-xs opacity-50 border-2 border-dashed border-white',
        colorClass
      )}
      style={style}
    >
      <span className="truncate">{job.serial_number}</span>
    </div>
  );
}
