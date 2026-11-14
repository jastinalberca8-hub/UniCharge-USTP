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
