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

/** Parse description stored as Location: ...\nContact: ...\n\n[Body] */
export function parseAlbumDescription(desc: string | null | undefined): {
  location: string;
  contact: string;
  description: string;
} {
  if (!desc) return { location: '', contact: '', description: '' };

  const strictMatch = desc.match(/^Location:\s*(.*?)\r?\nContact:\s*(.*?)\r?\n\r?\n([\s\S]*)$/i);
  if (strictMatch) {
    return {
      location: strictMatch[1].trim(),
      contact: strictMatch[2].trim(),
      description: strictMatch[3].trim(),
    };
  }

  const lines = desc.split(/\r?\n/);
  let location = '';
  let contact = '';
  const bodyLines: string[] = [];
  let inBody = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inBody && trimmed.toLowerCase().startsWith('location:')) {
      location = trimmed.replace(/^location:\s*/i, '').trim();
    } else if (!inBody && trimmed.toLowerCase().startsWith('contact:')) {
      contact = trimmed.replace(/^contact:\s*/i, '').trim();
    } else if (!inBody && trimmed === '') {
      if (location || contact) {
        inBody = true;
      }
    } else {
      inBody = true;
      bodyLines.push(line);
    }
  }

  return {
    location,
    contact,
    description: bodyLines.join('\n').trim(),
  };
}

/** Format location, contact, and body into structured album description */
export function formatAlbumDescription(location: string, contact: string, desc: string): string {
  return `Location: ${location.trim()}\nContact: ${contact.trim()}\n\n${desc.trim()}`;
}
