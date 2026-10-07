import { describe, it, expect } from "vitest";
import { gerarAlertasDinamicos } from "@/utils/alertGenerator";
import { CONFIG_PADRAO } from "@/store/useStore";
import { criarLeitao, criarLote, criarMatriz, dia } from "./fixtures";

const hoje = dia("2026-10-07");

describe("gerarAlertasDinamicos", () => {
  it("não gera alertas sem dados", () => {
    expect(gerarAlertasDinamicos([], [], CONFIG_PADRAO, hoje)).toEqual([]);
  });

  it("alerta vacina atrasada como crítica e próxima como aviso", () => {
    const lote = criarLote({
      dataParto: "2026-10-05",
      vacinasPendentes: [
        { id: "v1", nome: "Ferro", dataAgendada: "2026-10-05", aplicada: false },
        { id: "v2", nome: "Circovírus", dataAgendada: "2026-10-10", aplicada: false },
        { id: "v3", nome: "Aplicada", dataAgendada: "2026-10-01", aplicada: true },
      ],
    });
    const alertas = gerarAlertasDinamicos([lote], [], CONFIG_PADRAO, hoje).filter((a) => a.tipo === "vacinacao");
    expect(alertas).toHaveLength(2);
    expect(alertas.find((a) => a.id === "vacina-v1")).toMatchObject({ titulo: "Vacina Atrasada!", severidade: "critical" });
    expect(alertas.find((a) => a.id === "vacina-v2")).toMatchObject({ titulo: "Próxima Vacinação", severidade: "warning" });
    // o alerta leva direto para a aba de vacinas do lote
    expect(alertas.every((a) => a.link === "/lotes/lote-1?aba=vacinas")).toBe(true);
  });

  it("detecta leitão com ganho de peso abaixo da média e ignora quem não foi pesado", () => {
    const pesado = (id: string, peso: number) =>
      criarLeitao({ id, identificador: id.toUpperCase(), pesoAtual: peso, pesagens: [{ id: `p-${id}`, leitaoId: id, peso, data: "2026-10-07" }] });
    const lote = criarLote({
      leitoes: [
        pesado("a", 3.3),
        pesado("b", 3.3),
        pesado("c", 2.1),
        criarLeitao({ id: "d", identificador: "D" }), // sem pesagem: não deve gerar alerta
      ],
    });
    const alertas = gerarAlertasDinamicos([lote], [], CONFIG_PADRAO, hoje).filter((a) => a.tipo === "baixo_peso");
    expect(alertas).toHaveLength(1);
    expect(alertas[0].leitaoId).toBe("c");
    expect(alertas[0].link).toBe("/lotes/lote-1?leitao=c");
  });

  it("usa a data prevista do ciclo para o alerta de parto (não a data de entrada)", () => {
    const antiga = criarMatriz({ id: "m1", dataEntrada: "2020-01-01", statusReprodutivo: "Vazia" });
    const gestante = criarMatriz({
      id: "m2",
      identificador: "M-02",
      statusReprodutivo: "Gestante",
      ciclos: [
        {
          id: "c1",
          dataCobertura: "2026-06-16",
          tipoCobertura: "Inseminação artificial",
          dataPrevistaParto: "2026-10-08",
          status: "Em gestação",
        },
      ],
    });
    const alertas = gerarAlertasDinamicos([], [antiga, gestante], CONFIG_PADRAO, hoje);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({ tipo: "parto", matrizId: "m2", severidade: "critical", link: "/matrizes/m2" });
  });

  it("alerta mortalidade e natimortalidade acima do limite", () => {
    const lote = criarLote({
      nascidosVivos: 8,
      nascidosMortos: 2,
      leitoes: [criarLeitao({ id: "a" }), criarLeitao({ id: "b" }), criarLeitao({ id: "c", status: "Morto" })],
    });
    const titulos = gerarAlertasDinamicos([lote], [], CONFIG_PADRAO, hoje).map((a) => a.titulo);
    expect(titulos).toContain("Alta Taxa de Mortalidade");
    expect(titulos).toContain("Alta Taxa de Natimortos");
  });

  it("ordena críticos antes de avisos e informativos", () => {
    const lote = criarLote({
      dataParto: "2026-09-30", // 7 dias: pesagem hoje (info)
      leitoes: [criarLeitao({ id: "a", statusSaude: "Crítico" }), criarLeitao({ id: "b", statusSaude: "Em tratamento" })],
    });
    const severidades = gerarAlertasDinamicos([lote], [], CONFIG_PADRAO, hoje).map((a) => a.severidade);
    expect(severidades).toEqual([...severidades].sort((a, b) => ["critical", "warning", "info"].indexOf(a) - ["critical", "warning", "info"].indexOf(b)));
    expect(severidades[0]).toBe("critical");
    expect(severidades).toContain("info");
  });
});

describe("links dos alertas levam ao lugar da ação", () => {
  it("pesagem abre a pesagem do lote e desmame abre a matriz", () => {
    const matriz = criarMatriz({ id: "m1" });
    const lote = criarLote({ matrizId: "m1", dataParto: "2026-09-16" }); // 21 dias: pesagem hoje e desmame hoje
    const alertas = gerarAlertasDinamicos([lote], [matriz], CONFIG_PADRAO, hoje);
    expect(alertas.find((a) => a.tipo === "pesagem")?.link).toBe("/lotes/lote-1?acao=pesagem");
    expect(alertas.find((a) => a.tipo === "desmame")?.link).toBe("/matrizes/m1");
  });

  it("desmame de lote sem matriz abre o próprio lote", () => {
    const lote = criarLote({ matrizId: "", dataParto: "2026-09-16" });
    const alertas = gerarAlertasDinamicos([lote], [], CONFIG_PADRAO, hoje);
    expect(alertas.find((a) => a.tipo === "desmame")?.link).toBe("/lotes/lote-1");
  });
});
