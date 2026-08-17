/** Format a number as Indian Rupee with Indian digit grouping (e.g. ₹1,25,000). */
export function formatINR(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(n) || n === null || n === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format a date string as "12 Jan 2024" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
