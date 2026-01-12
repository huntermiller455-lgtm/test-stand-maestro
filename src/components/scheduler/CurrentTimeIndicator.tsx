import { useEffect, useState } from 'react';
import { getCurrentTimePosition, getTimeWindow } from '@/lib/timeUtils';
import { ViewMode } from '@/types/scheduler';

interface CurrentTimeIndicatorProps {
  currentDate: Date;
  mode: ViewMode;
}

export function CurrentTimeIndicator({ currentDate, mode }: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);
  
  const { start: windowStart, end: windowEnd } = getTimeWindow(currentDate, mode);
  const position = getCurrentTimePosition(now, windowStart, windowEnd);
  
  if (position === null) return null;
  
  return (
    <div
      className="time-indicator"
      style={{ left: `calc(128px + ${position}% * (100% - 128px) / 100)` }}
    >
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-destructive rounded-full" />
    </div>
  );
}
