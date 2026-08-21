const BYTES_PER_UNIT = 1024;

/** "512 Б" / "1.5 KB" / "5 МБ" — units and number format are locale-provided. */
export function formatBytes(bytes: number, units: readonly string[], locale: string): string {
  let value = bytes;
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < units.length - 1) {
    value /= BYTES_PER_UNIT;
    unit++;
  }
  const rendered = value.toLocaleString(locale, {
    maximumFractionDigits: unit === 0 || value >= 100 ? 0 : 1,
  });
  return `${rendered} ${units[unit]}`;
}

export function formatPercent(part: number, whole: number, locale: string): string {
  if (whole <= 0) return "0%";
  const pct = (part / whole) * 100;
  if (pct >= 99.95) return "100%";
  if (pct < 0.1) return `<${(0.1).toLocaleString(locale)}%`;
  return `${pct.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
}
