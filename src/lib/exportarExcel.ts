/**
 * Planilha Excel (.xlsx) dos relatórios, com a mesma identidade do PDF:
 * logo, "MatrizPro · fazenda", título, data de emissão, responsável e cidade.
 * A biblioteca (exceljs) só é carregada quando a pessoa clica em exportar.
 */

export type FormatoColuna = "texto" | "inteiro" | "decimal" | "moeda" | "data";

export interface ColunaExcel {
  titulo: string;
  largura?: number;
  formato?: FormatoColuna;
}

export interface PlanilhaRelatorio {
  nomeArquivo: string;
  titulo: string;
  fazenda?: string;
  responsavel?: string;
  cidade?: string;
  emitidoEm: string;
  colunas: ColunaExcel[];
  /** Valores crus (números como número, datas já formatadas como texto). */
  linhas: (string | number | null | undefined)[][];
}

const VERDE = "FF1F4D3A";
const VERDE_CLARO = "FFEAF2EE";

const FORMATOS: Record<FormatoColuna, string | undefined> = {
  texto: undefined,
  inteiro: "#,##0",
  decimal: "#,##0.00",
  moeda: '"R$" #,##0.00',
  data: undefined,
};

async function logoBase64(): Promise<string | null> {
  try {
    const resp = await fetch("/logo-relatorio.png");
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((ok) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.onerror = () => ok(null);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportarExcel(p: PlanilhaRelatorio) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "MatrizPro";
  wb.created = new Date();

  // Nome da aba: sem o " — ano" e no limite de 31 caracteres do Excel
  const nomeAba = p.titulo.split(" — ")[0].replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
  const ws = wb.addWorksheet(nomeAba, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    views: [{ state: "frozen", ySplit: 6, showGridLines: false }],
  });
  const total = Math.max(p.colunas.length, 4);

  // ---------------------------------------------------------------- cabeçalho
  // Linhas 1–4: logo (coluna A) + textos (B em diante); linha 5 = faixa verde
  ws.getRow(1).height = 20;
  ws.getRow(2).height = 26;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 6;
  ws.getRow(5).height = 4;

  const logo = await logoBase64();
  if (logo) {
    const id = wb.addImage({ base64: logo, extension: "png" });
    ws.addImage(id, { tl: { col: 0.15, row: 0.15 }, ext: { width: 60, height: 60 }, editAs: "oneCell" });
  }

  const textos: [number, string, Partial<import("exceljs").Font>][] = [
    [1, `MatrizPro${p.fazenda ? ` · ${p.fazenda}` : ""}`, { bold: true, size: 11, color: { argb: VERDE } }],
    [2, p.titulo, { bold: true, size: 16, color: { argb: "FF111111" } }],
    [
      3,
      [`Emitido em ${p.emitidoEm}`, p.responsavel && `Responsável: ${p.responsavel}`, p.cidade].filter(Boolean).join(" · "),
      { size: 10, color: { argb: "FF6B7280" } },
    ],
  ];
  for (const [linha, valor, fonte] of textos) {
    ws.mergeCells(linha, 2, linha, total);
    const c = ws.getCell(linha, 2);
    c.value = valor;
    c.font = { name: "Calibri", ...fonte };
    c.alignment = { vertical: "middle" };
  }
  for (let col = 1; col <= total; col++) {
    ws.getCell(5, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
  }

  // ------------------------------------------------------------------- tabela
  const cab = ws.getRow(6);
  p.colunas.forEach((col, i) => {
    const c = cab.getCell(i + 1);
    c.value = col.titulo;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
    c.alignment = { vertical: "middle", horizontal: col.formato && col.formato !== "texto" && col.formato !== "data" ? "right" : "left", wrapText: true };
  });
  cab.height = 22;

  p.linhas.forEach((valores, i) => {
    const row = ws.getRow(7 + i);
    p.colunas.forEach((col, j) => {
      const c = row.getCell(j + 1);
      const v = valores[j];
      c.value = v === undefined || v === "" ? null : v;
      const fmt = FORMATOS[col.formato ?? "texto"];
      if (fmt) c.numFmt = fmt;
      c.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
      if (i % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
    });
  });

  if (p.linhas.length === 0) {
    ws.mergeCells(7, 1, 7, total);
    ws.getCell(7, 1).value = "Nenhum registro no período.";
    ws.getCell(7, 1).font = { italic: true, color: { argb: "FF6B7280" } };
  }

  // Larguras: coluna A também abriga a logo (mínimo ~10)
  p.colunas.forEach((col, i) => {
    const maior = Math.max(col.titulo.length, ...p.linhas.map((l) => String(l[i] ?? "").length));
    ws.getColumn(i + 1).width = col.largura ?? Math.min(Math.max(maior + 2, i === 0 ? 11 : 9), 40);
  });

  if (p.linhas.length > 0) ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: p.colunas.length } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = p.nomeArquivo.endsWith(".xlsx") ? p.nomeArquivo : `${p.nomeArquivo}.xlsx`;
  // Alguns navegadores (Firefox, Safari, apps) só baixam se o link estiver na página
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 2000);
}
