// All date/time utilities use Colombia timezone (UTC-5, no DST)
export const TZ = 'America/Bogota';

// Returns 'YYYY-MM-DD' for today in Colombia
export function todayColombia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// Returns 'YYYY-MM-DD' for n days ago in Colombia
export function daysAgoColombia(n) {
  return new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA', { timeZone: TZ });
}

// Parse a SQLite UTC timestamp ("2024-03-26 20:06:00") into a proper Date
export function parseTS(str) {
  if (!str) return new Date();
  return new Date(str.replace(' ', 'T') + 'Z');
}

// "03:06 p. m." in Colombia timezone
export function fmtTime(str) {
  return parseTS(str).toLocaleTimeString('es-CO', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "26/03/26" in Colombia timezone
export function fmtDate(str) {
  return parseTS(str).toLocaleDateString('es-CO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

// "jueves, 26 de marzo de 2026"
export function fmtDateLong(date = new Date()) {
  return date.toLocaleDateString('es-CO', {
    timeZone: TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
