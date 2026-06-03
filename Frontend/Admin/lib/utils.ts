export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format paise -> INR with 2 decimals and thousand separators. */
export function formatINR(paise: number, opts: { withSymbol?: boolean; decimals?: number } = {}): string {
  const { withSymbol = true, decimals = 2 } = opts;
  const rupees = paise / 100;
  const num = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rupees);
  return withSymbol ? `₹${num}` : num;
}

/** Format a BV amount (stored in paise too per convention) as a compact INR-ish number. */
export function formatBV(paise: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(paise / 100);
}

export function formatDate(input: string | Date, withTime = true): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return String(input);
  const date = d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function truncate(str: string, length: number): string {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function inDateRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return !from && !to;
  if (!from && !to) return true;
  const t = new Date(dateStr).getTime();
  if (from && t < parseYmd(from).getTime()) return false;
  if (to) {
    const end = parseYmd(to);
    end.setUTCHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoYmd(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
