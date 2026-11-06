// Money helpers. Prices are stored as integer piastres (1 EGP = 100 piastres).

// Convert EGP input like "150.50" to piastres (15050) without float math.
export function egpToPiastres(value: string | number): number | null {
  const text = typeof value === "number" ? String(value) : value.trim();

  // Only digits with an optional dot and at most 2 decimals.
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  const piastres = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(piastres) ? piastres : null;
}

// Convert piastres (15050) to EGP text ("150.50") for display.
export function piastresToEgp(piastres: number): string {
  const safe = Math.max(0, Math.trunc(piastres));
  const whole = Math.floor(safe / 100);
  const fraction = safe % 100;

  return `${whole}.${String(fraction).padStart(2, "0")}`;
}
