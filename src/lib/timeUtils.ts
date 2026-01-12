import { addDays, setHours, setMinutes, setSeconds, format, differenceInMinutes, addHours } from 'date-fns';
import { ViewMode } from '@/types/scheduler';

export function getTimeWindow(date: Date, mode: ViewMode): { start: Date; end: Date } {
  const baseDate = new Date(date);
  baseDate.setSeconds(0);
  baseDate.setMilliseconds(0);
  
  if (mode === 'shift') {
    // Shift day: 6:00 AM to 5:00 AM next day (23 hours displayed as 24)
    const start = setSeconds(setMinutes(setHours(baseDate, 6), 0), 0);
    const end = addDays(setSeconds(setMinutes(setHours(baseDate, 6), 0), 0), 1);
    return { start, end };
  } else {
    // Calendar day: midnight to midnight
    const start = setSeconds(setMinutes(setHours(baseDate, 0), 0), 0);
    const end = addDays(start, 1);
    return { start, end };
  }
}

export function getHoursForMode(mode: ViewMode): number[] {
  if (mode === 'shift') {
    // 6 AM to 5 AM next day
    return [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  } else {
    // Midnight to midnight
    return Array.from({ length: 24 }, (_, i) => i);
  }
}

export function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${ampm}`;
}

export function getJobPosition(
  jobStart: Date,
  durationHours: number,
  windowStart: Date,
  windowEnd: Date
): { leftPercent: number; widthPercent: number; isWrapped: boolean; segments: { leftPercent: number; widthPercent: number }[] } {
  const windowMinutes = differenceInMinutes(windowEnd, windowStart);
  const jobStartMinutes = differenceInMinutes(jobStart, windowStart);
  const jobDurationMinutes = durationHours * 60;
  const jobEndMinutes = jobStartMinutes + jobDurationMinutes;

  // Job starts before window
  if (jobStartMinutes < 0) {
    const adjustedStart = 0;
    const adjustedDuration = Math.min(jobDurationMinutes + jobStartMinutes, windowMinutes);
    return {
      leftPercent: 0,
      widthPercent: (adjustedDuration / windowMinutes) * 100,
      isWrapped: false,
      segments: [{ leftPercent: 0, widthPercent: (adjustedDuration / windowMinutes) * 100 }]
    };
  }

  // Job ends after window (wrap around)
  if (jobEndMinutes > windowMinutes) {
    const firstSegmentWidth = ((windowMinutes - jobStartMinutes) / windowMinutes) * 100;
    const secondSegmentWidth = ((jobEndMinutes - windowMinutes) / windowMinutes) * 100;
    
    return {
      leftPercent: (jobStartMinutes / windowMinutes) * 100,
      widthPercent: firstSegmentWidth,
      isWrapped: true,
      segments: [
        { leftPercent: (jobStartMinutes / windowMinutes) * 100, widthPercent: firstSegmentWidth },
        { leftPercent: 0, widthPercent: Math.min(secondSegmentWidth, 100) }
      ]
    };
  }

  // Normal case
  return {
    leftPercent: (jobStartMinutes / windowMinutes) * 100,
    widthPercent: (jobDurationMinutes / windowMinutes) * 100,
    isWrapped: false,
    segments: [{ leftPercent: (jobStartMinutes / windowMinutes) * 100, widthPercent: (jobDurationMinutes / windowMinutes) * 100 }]
  };
}

export function getCurrentTimePosition(currentTime: Date, windowStart: Date, windowEnd: Date): number | null {
  const windowMinutes = differenceInMinutes(windowEnd, windowStart);
  const currentMinutes = differenceInMinutes(currentTime, windowStart);
  
  if (currentMinutes < 0 || currentMinutes > windowMinutes) {
    return null;
  }
  
  return (currentMinutes / windowMinutes) * 100;
}

export function getTimeFromPosition(
  positionPercent: number,
  windowStart: Date,
  windowEnd: Date
): Date {
  const windowMinutes = differenceInMinutes(windowEnd, windowStart);
  const minutes = (positionPercent / 100) * windowMinutes;
  return addHours(windowStart, minutes / 60);
}
