import { getHoursForMode, formatHour } from '@/lib/timeUtils';
import { ViewMode } from '@/types/scheduler';

interface TimeHeaderProps {
  mode: ViewMode;
}

export function TimeHeader({ mode }: TimeHeaderProps) {
  const hours = getHoursForMode(mode);

  return (
    <div className="flex border-b border-border bg-card sticky top-0 z-30">
      <div className="w-32 flex-shrink-0 px-3 py-2 font-mono font-bold text-sm uppercase tracking-wide text-muted-foreground border-r border-border flex items-center">
        Machine
      </div>
      <div className="flex-1 flex">
        {hours.map((hour, index) => (
          <div
            key={`${hour}-${index}`}
            className="hour-header flex-1 py-2 min-w-[40px]"
          >
            {formatHour(hour)}
          </div>
        ))}
      </div>
    </div>
  );
}
