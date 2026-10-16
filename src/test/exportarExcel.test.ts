import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import { exportarExcel } from "@/lib/exportarExcel";

// PNG 1x1 transparente (a logo de verdade vem de /logo-relatorio.png)
const PNG_1X1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0)
);

let baixados: { nome: string; blob: Blob }[] = [];

beforeEach(() => {
  baixados = [];
  const blobs = new Map<string, Blob>();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob([PNG_1X1], { type: "image/png" }))));
  URL.createObjectURL = vi.fn((b: Blob) => {
    const url = `blob:teste/${blobs.size}`;
    blobs.set(url, b);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    // o link precisa estar na página na hora do clique (Firefox/Safari)
    expect(document.body.contains(this)).toBe(true);
    baixados.push({ nome: this.download, blob: blobs.get(this.href)! });
  });
});

describe("exportarExcel", () => {
  it("baixa a planilha com logo, cabeçalho da fazenda e a tabela", async () => {
    await exportarExcel({
      nomeArquivo: "plantel-2026-10-15",
      titulo: "Relatório Geral do Plantel — 2026",
      fazenda: "CELA DOS YPES",
      responsavel: "Ghost",
      cidade: "DF",
      emitidoEm: "15/10/2026",
      colunas: [{ titulo: "Lote" }, { titulo: "Nascidos vivos", formato: "inteiro" }, { titulo: "Valor (R$)", formato: "moeda" }],
      linhas: [
        ["L1", 12, 1500.5],
        ["L2", 10, null],
      ],
    });

    expect(baixados).toHaveLength(1);
    expect(baixados[0].nome).toBe("plantel-2026-10-15.xlsx");

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await baixados[0].blob.arrayBuffer());
    const ws = wb.worksheets[0];
    expect(ws.name).toBe("Relatório Geral do Plantel");
    expect(ws.getImages()).toHaveLength(1);
    expect(ws.getCell(1, 2).value).toBe("MatrizPro · CELA DOS YPES");
    expect(ws.getCell(2, 2).value).toBe("Relatório Geral do Plantel — 2026");
    expect(ws.getCell(3, 2).value).toBe("Emitido em 15/10/2026 · Responsável: Ghost · DF");
    expect((ws.getRow(6).values as unknown[]).slice(1)).toEqual(["Lote", "Nascidos vivos", "Valor (R$)"]);
    expect(ws.getCell(7, 3).value).toBe(1500.5);
    expect(ws.getCell(7, 3).numFmt).toContain("R$");
  });

  it("gera mesmo sem dados e sem logo disponível", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    await exportarExcel({
      nomeArquivo: "custos.xlsx",
      titulo: "Relatório de Custos",
      emitidoEm: "15/10/2026",
      colunas: [{ titulo: "Lote" }, { titulo: "Valor (R$)", formato: "moeda" }],
      linhas: [],
    });
    expect(baixados.map((b) => b.nome)).toEqual(["custos.xlsx"]);
  });
});
