import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/**
 * Converte uma data "yyyy-MM-dd" (ou ISO completo) para Date no fuso local.
 * `new Date("2026-10-07")` interpreta a string como UTC e, no Brasil,
 * resulta no dia anterior — por isso usamos parseISO.
 */
export function parseData(valor: string | undefined | null): Date | null {
  if (!valor) return null;
  const data = parseISO(valor);
  return isValid(data) ? data : null;
}

export function formatarData(valor: string | undefined | null, padrao = "dd/MM/yyyy"): string {
  const data = parseData(valor);
  return data ? format(data, padrao) : "—";
}

export function hojeISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function paraISODia(data: Date): string {
  return format(data, "yyyy-MM-dd");
}

/** Dias de calendário de `inicio` até `fim` (padrão: hoje). */
export function diasEntre(inicio: string | undefined | null, fim: Date | string = new Date()): number {
  const a = parseData(inicio);
  const b = typeof fim === "string" ? parseData(fim) : fim;
  if (!a || !b) return 0;
  return differenceInCalendarDays(b, a);
}

export function somarDias(valor: string, dias: number): string {
  const data = parseData(valor);
  return data ? paraISODia(addDays(data, dias)) : valor;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarNumero(valor: number, casas = 1): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
