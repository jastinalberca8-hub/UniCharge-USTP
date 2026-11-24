export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if (remainingMinutes === 0) {
    return hourText;
  }
  return `${hourText} ${remainingMinutes} ${remainingMinutes === 1 ? 'min' : 'mins'}`;
}

export function formatSessionTimer(totalSecs: number): string {
  const safeSecs = Math.max(0, Math.floor(totalSecs));
  const hours = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSessionDateTime(input: number | Date): string {
  const parsed = input instanceof Date ? input : new Date(input);
  const validDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(validDate);
}

