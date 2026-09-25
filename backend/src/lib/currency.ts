import { prisma } from "./prisma.js";

// Multi-currency (CURRENCIES_AND_WALLETS.md). Amounts are stored in each
// currency's minor units and cross the wire as plain decimal numbers
// (COP 12500, USD 5.99); only the route layer converts.

export const CURRENCY_CATALOG: Record<string, { name: string; symbol: string; decimals: number }> = {
  COP: { name: "Peso colombiano", symbol: "$", decimals: 0 },
  USD: { name: "Dólar estadounidense", symbol: "US$", decimals: 2 },
  EUR: { name: "Euro", symbol: "€", decimals: 2 },
  MXN: { name: "Peso mexicano", symbol: "MX$", decimals: 2 },
  PEN: { name: "Sol peruano", symbol: "S/", decimals: 2 },
  BRL: { name: "Real brasileño", symbol: "R$", decimals: 2 },
  GBP: { name: "Libra esterlina", symbol: "£", decimals: 2 },
  CLP: { name: "Peso chileno", symbol: "CLP$", decimals: 0 },
  ARS: { name: "Peso argentino", symbol: "AR$", decimals: 2 },
};
export const CURRENCY_CODES = Object.keys(CURRENCY_CATALOG) as [string, ...string[]];

// Reference rates in COP per unit, used when fx_rates has no row for the
// day. There is no live FX feed yet — these are documented stand-ins, like
// the old fixed COP/USD rate.
const REFERENCE_COP: Record<string, number> = {
  COP: 1,
  USD: 3950,
  EUR: 4300,
  MXN: 215,
  PEN: 1050,
  BRL: 720,
  GBP: 5000,
  CLP: 4.2,
  ARS: 4,
};

export function decimalsOf(code: string): number {
  return CURRENCY_CATALOG[code]?.decimals ?? 2;
}

export function toMinor(amount: number, code: string): bigint {
  return BigInt(Math.round(amount * 10 ** decimalsOf(code)));
}

export function fromMinor(minor: bigint, code: string): number {
  const d = decimalsOf(code);
  return d === 0 ? Number(minor) : Number(minor) / 10 ** d;
}

// 1 `from` = rate `to`, at the reference rate.
export function referenceRate(from: string, to: string): number {
  if (from === to) return 1;
  return (REFERENCE_COP[from] ?? 1) / (REFERENCE_COP[to] ?? 1);
}

// Rate of the day: a stored fx_rates row when present, else the reference.
export async function rateOn(from: string, to: string, date: Date = new Date()): Promise<number> {
  if (from === to) return 1;
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const row = await prisma.fxRate.findFirst({ where: { base: from, quote: to, date: { lte: day } }, orderBy: { date: "desc" } });
  return row ? Number(row.rate) : referenceRate(from, to);
}

// Converts minor units of `from` into minor units of `to`.
export function convertMinor(minor: bigint, from: string, to: string, rate = referenceRate(from, to)): bigint {
  if (from === to) return minor;
  return toMinor(fromMinor(minor, from) * rate, to);
}

export async function principalOf(userId: string): Promise<string> {
  const row = await prisma.userCurrency.findFirst({ where: { userId, isPrincipal: true } });
  return row?.code ?? "COP";
}
