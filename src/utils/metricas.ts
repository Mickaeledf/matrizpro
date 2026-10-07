import { Lote, Leitao } from "@/types";
import { diasEntre } from "@/lib/date";

/** Data e peso da última pesagem do leitão (ou do nascimento, se não houver). */
export function ultimaPesagem(leitao: Leitao): { data: string; peso: number } {
  const ordenadas = [...(leitao.pesagens || [])].sort((a, b) => a.data.localeCompare(b.data));
  const ultima = ordenadas[ordenadas.length - 1];
  return ultima
    ? { data: ultima.data, peso: ultima.peso }
    : { data: leitao.dataNascimento, peso: leitao.pesoNascimento };
}

/** Ganho de peso diário (kg/dia) do nascimento até a última pesagem. */
export function calcularGPD(leitao: Leitao): number | null {
  const { data, peso } = ultimaPesagem(leitao);
  const dias = diasEntre(leitao.dataNascimento, data.slice(0, 10));
  if (dias <= 0) return null;
  return (peso - leitao.pesoNascimento) / dias;
}

/**
 * Leitões ativos cujo GPD está abaixo da média do lote além do limite (%).
 * Usa o GPD (e não o peso bruto) para não acusar leitões que só não foram pesados ainda.
 * Retorna leitaoId → percentual abaixo da média.
 */
export function leitoesAbaixoDaMedia(lote: Lote, limitePercent: number): Map<string, number> {
  const comGPD = lote.leitoes
    .filter((lt) => lt.status === "Ativo")
    .map((lt) => ({ id: lt.id, gpd: calcularGPD(lt) }))
    .filter((x): x is { id: string; gpd: number } => x.gpd !== null);

  const resultado = new Map<string, number>();
  if (comGPD.length < 2) return resultado;
  const mediaGPD = media(comGPD.map((x) => x.gpd));
  if (mediaGPD <= 0) return resultado;

  comGPD.forEach(({ id, gpd }) => {
    const percentAbaixo = (1 - gpd / mediaGPD) * 100;
    if (percentAbaixo > limitePercent) resultado.set(id, Math.round(percentAbaixo));
  });
  return resultado;
}

export interface EstatisticasLote {
  idadeDias: number;
  registrados: number;
  ativos: number;
  mortos: number;
  vendidos: number;
  mortalidadePercent: number;
  natimortalidadePercent: number;
  pesoMedio: number;
  gpdMedio: number | null;
  totalCustos: number;
  totalReceitas: number;
  custosSaude: number;
  saldo: number;
  kgProduzidos: number;
  custoPorKg: number | null;
  vacinasPendentes: number;
}

const media = (valores: number[]) =>
  valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;

export function estatisticasLote(lote: Lote): EstatisticasLote {
  const leitoes = lote.leitoes || [];
  const ativos = leitoes.filter((l) => l.status === "Ativo");
  const mortos = leitoes.filter((l) => l.status === "Morto").length;
  const vendidos = leitoes.filter((l) => l.status === "Vendido").length;

  const gpds = ativos.map(calcularGPD).filter((g): g is number => g !== null);

  const lancamentos = lote.lancamentos || [];
  const custosSaude = leitoes
    .flatMap((l) => l.registrosSaude || [])
    .reduce((acc, r) => acc + (r.custo || 0), 0);
  const totalCustos =
    lancamentos.filter((l) => l.tipo === "custo").reduce((acc, l) => acc + l.valor, 0) + custosSaude;
  const totalReceitas = lancamentos.filter((l) => l.tipo === "receita").reduce((acc, l) => acc + l.valor, 0);

  const kgProduzidos = leitoes
    .filter((l) => l.status !== "Morto")
    .reduce((acc, l) => acc + Math.max(0, l.pesoAtual - l.pesoNascimento), 0);

  const totalNascidos = lote.nascidosVivos + lote.nascidosMortos;

  return {
    idadeDias: Math.max(0, diasEntre(lote.dataParto)),
    registrados: leitoes.length,
    ativos: ativos.length,
    mortos,
    vendidos,
    mortalidadePercent: leitoes.length > 0 ? (mortos / leitoes.length) * 100 : 0,
    natimortalidadePercent: totalNascidos > 0 ? (lote.nascidosMortos / totalNascidos) * 100 : 0,
    pesoMedio: media(ativos.map((l) => l.pesoAtual)),
    gpdMedio: gpds.length > 0 ? media(gpds) : null,
    totalCustos,
    totalReceitas,
    custosSaude,
    saldo: totalReceitas - totalCustos,
    kgProduzidos,
    custoPorKg: kgProduzidos > 0 && totalCustos > 0 ? totalCustos / kgProduzidos : null,
    vacinasPendentes: (lote.vacinasPendentes || []).filter((v) => !v.aplicada).length,
  };
}
