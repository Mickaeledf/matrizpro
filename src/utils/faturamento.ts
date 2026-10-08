import { Lote, Matriz, Reprodutor } from "@/types";

/** Origem da venda: leitões (produção) ou animais de descarte (matrizes e reprodutores). */
export type TipoVenda = "leitao" | "matriz" | "reprodutor";

export interface ItemVendido {
  vendaId: string;
  tipo: TipoVenda;
  data: string;
  valor: number;
  pesoKg?: number;
  comprador?: string;
  animalId: string;
  animal: string;
  loteId?: string;
  loteNome?: string;
}

export interface VendaAgrupada {
  vendaId: string;
  tipo: TipoVenda;
  data: string;
  comprador?: string;
  loteId?: string;
  loteNome?: string;
  animalId?: string;
  itens: ItemVendido[];
  quantidade: number;
  valor: number;
  pesoKg: number;
}

/** Todos os animais vendidos (leitões, matrizes e reprodutores). */
export function listarVendidos(lotes: Lote[], matrizes: Matriz[], reprodutores: Reprodutor[]): ItemVendido[] {
  const itens: ItemVendido[] = [];
  for (const l of lotes) {
    for (const lt of l.leitoes) {
      if (!lt.venda) continue;
      itens.push({
        ...lt.venda,
        tipo: "leitao",
        animalId: lt.id,
        animal: lt.identificador,
        loteId: l.id,
        loteNome: l.nome,
      });
    }
  }
  for (const m of matrizes) {
    if (m.venda) itens.push({ ...m.venda, tipo: "matriz", animalId: m.id, animal: m.identificador });
  }
  for (const r of reprodutores) {
    if (r.venda) itens.push({ ...r.venda, tipo: "reprodutor", animalId: r.id, animal: r.identificador });
  }
  return itens.sort((a, b) => b.data.localeCompare(a.data));
}

/** Junta os animais vendidos na mesma operação (mesmo vendaId). */
export function agruparVendas(itens: ItemVendido[]): VendaAgrupada[] {
  const mapa = new Map<string, VendaAgrupada>();
  for (const i of itens) {
    const v =
      mapa.get(i.vendaId) ??
      ({
        vendaId: i.vendaId,
        tipo: i.tipo,
        data: i.data,
        comprador: i.comprador,
        loteId: i.loteId,
        loteNome: i.loteNome,
        animalId: i.tipo === "leitao" ? undefined : i.animalId,
        itens: [],
        quantidade: 0,
        valor: 0,
        pesoKg: 0,
      } satisfies VendaAgrupada);
    v.itens.push(i);
    v.quantidade += 1;
    v.valor += i.valor;
    v.pesoKg += i.pesoKg ?? 0;
    mapa.set(i.vendaId, v);
  }
  return [...mapa.values()].sort((a, b) => b.data.localeCompare(a.data));
}

export interface ResumoFaturamento {
  total: number;
  leitoes: { quantidade: number; valor: number; pesoKg: number; precoMedio: number | null; precoKg: number | null };
  descarte: { quantidade: number; valor: number };
}

export function resumirFaturamento(itens: ItemVendido[]): ResumoFaturamento {
  const leitoes = itens.filter((i) => i.tipo === "leitao");
  const descarte = itens.filter((i) => i.tipo !== "leitao");
  const valorLeitoes = leitoes.reduce((a, i) => a + i.valor, 0);
  const comPeso = leitoes.filter((i) => i.pesoKg);
  const pesoKg = comPeso.reduce((a, i) => a + (i.pesoKg ?? 0), 0);
  return {
    total: valorLeitoes + descarte.reduce((a, i) => a + i.valor, 0),
    leitoes: {
      quantidade: leitoes.length,
      valor: valorLeitoes,
      pesoKg,
      precoMedio: leitoes.length > 0 ? valorLeitoes / leitoes.length : null,
      precoKg: pesoKg > 0 ? comPeso.reduce((a, i) => a + i.valor, 0) / pesoKg : null,
    },
    descarte: { quantidade: descarte.length, valor: descarte.reduce((a, i) => a + i.valor, 0) },
  };
}

/** Faturamento por mês (yyyy-MM), separando leitões e descarte. */
export function faturamentoPorMes(itens: ItemVendido[]): { mes: string; leitoes: number; descarte: number }[] {
  const mapa = new Map<string, { leitoes: number; descarte: number }>();
  for (const i of itens) {
    const mes = i.data.slice(0, 7);
    const m = mapa.get(mes) ?? { leitoes: 0, descarte: 0 };
    if (i.tipo === "leitao") m.leitoes += i.valor;
    else m.descarte += i.valor;
    mapa.set(mes, m);
  }
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v }));
}
