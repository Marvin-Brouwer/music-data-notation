/**
 * Responsibility
 * Infer rhythmic value from symbol class + presence of flags/dots.
 * 
 * Where the C# repo helps
 * GetDurationFromSymbol.
 * 
 * What you’ll implement yourself
 * Simple rule‑based mapping (e.g., “filled note head + 1 flag → eighth”).
 * 
 * TODO: Not sure if we want to keep this, why not just use these values directly?
 */

export function resolveDuration(label: string): string {
  // VexFlow duration strings: "w", "h", "q", "8", "16", etc.
  switch (label) {
    case 'whole':   return 'w';
    case 'half':    return 'h';
    case 'quarter': return 'q';
    case 'eighth':  return '8';
    case 'sixteenth': return '16';
    case 'rest_whole': return 'wr';
    case 'rest_half':  return 'hr';
    case 'rest_quarter': return 'qr';
    case 'rest_eighth': return '8r';
    case 'rest_sixteenth': return '16r';
    // add others as needed
    default: return 'q'; // safe fallback
  }
}