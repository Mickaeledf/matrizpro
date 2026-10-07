import { useMemo, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lote } from "@/types";
import { formatarData, formatarMoeda, formatarNumero, hojeISO } from "@/lib/date";
import { estatisticasLote } from "@/utils/metricas";
import { gerarAlertasDinamicos } from "@/utils/alertGenerator";

type TipoRelatorio = "geral" | "lote" | "financeiro";

const SecaoTitulo = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 mt-6 border-b pb-1 text-base font-bold text-foreground">{children}</h3>
);

function baixarCSV(nome: string, linhas: (string | number)[][]) {
  const conteudo = linhas
    .map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  // BOM para o Excel reconhecer acentos
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPage() {
  const { matrizes, lotes, configuracoes } = useStore();
  const [tipo, setTipo] = useState<TipoRelatorio>("geral");
  const [loteId, setLoteId] = useState<string>("");

  const loteSelecionado: Lote | undefined = lotes.find((l) => l.id === loteId) ?? lotes[0];
  const linhas = useMemo(() => lotes.map((l) => ({ lote: l, est: estatisticasLote(l) })), [lotes]);
  const alertas = useMemo(() => gerarAlertasDinamicos(lotes, matrizes, configuracoes), [lotes, matrizes, configuracoes]);

  const nomeMatriz = (id: string) => matrizes.find((m) => m.id === id)?.identificador ?? "—";

  const exportarCSV = () => {
    if (tipo === "lote" && loteSelecionado) {
      baixarCSV(`lote-${loteSelecionado.nome}-${hojeISO()}.csv`, [
        ["Leitão", "Sexo", "Peso nascimento (kg)", "Peso atual (kg)", "Situação", "Saúde", "Pesagens"],
        ...loteSelecionado.leitoes.map((lt) => [
          lt.identificador,
          lt.sexo,
          formatarNumero(lt.pesoNascimento, 2),
          formatarNumero(lt.pesoAtual, 2),
          lt.status,
          lt.statusSaude,
          lt.pesagens.length,
        ]),
      ]);
    } else if (tipo === "financeiro") {
      baixarCSV(`financeiro-${hojeISO()}.csv`, [
        ["Lote", "Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"],
        ...lotes.flatMap((l) =>
          l.lancamentos.map((x) => [l.nome, formatarData(x.data), x.tipo, x.categoria, x.descricao, formatarNumero(x.valor, 2)])
        ),
      ]);
    } else {
      baixarCSV(`plantel-${hojeISO()}.csv`, [
        ["Lote", "Matriz", "Parto", "Status", "Nascidos vivos", "Nascidos mortos", "Ativos", "Peso médio (kg)", "GPD (g/dia)", "Mortalidade (%)"],
        ...linhas.map(({ lote, est }) => [
          lote.nome,
          nomeMatriz(lote.matrizId),
          formatarData(lote.dataParto),
          lote.status,
          lote.nascidosVivos,
          lote.nascidosMortos,
          est.ativos,
          formatarNumero(est.pesoMedio, 2),
          est.gpdMedio !== null ? Math.round(est.gpdMedio * 1000) : "",
          formatarNumero(est.mortalidadePercent),
        ]),
      ]);
    }
  };

  const titulos: Record<TipoRelatorio, string> = {
    geral: "Relatório Geral do Plantel",
    lote: `Relatório do Lote ${loteSelecionado?.nome ?? ""}`,
    financeiro: "Relatório Financeiro",
  };

  const semDados = lotes.length === 0 && matrizes.length === 0;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <div className="flex flex-wrap gap-2">
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRelatorio)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Geral do plantel</SelectItem>
              <SelectItem value="lote">Por lote</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
            </SelectContent>
          </Select>
          {tipo === "lote" && lotes.length > 0 && (
            <Select value={loteSelecionado?.id} onValueChange={setLoteId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="gap-2" onClick={exportarCSV} disabled={semDados}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button className="gap-2" onClick={() => window.print()} disabled={semDados}>
            <Printer className="h-4 w-4" /> Gerar PDF
          </Button>
        </div>
      </div>

      {semDados ? (
        <div className="flex items-center justify-center py-16">
          <Card className="w-full max-w-md border border-border">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">Nada para relatar ainda</h2>
              <p className="text-sm text-muted-foreground">Cadastre matrizes e lotes para gerar relatórios.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border border-border print:border-0 print:shadow-none">
          <CardContent className="p-4 sm:p-8 print:p-0">
            <p className="mb-4 text-xs text-muted-foreground print:hidden">
              Prévia do relatório. Em "Gerar PDF", escolha "Salvar como PDF" como destino da impressão.
            </p>
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b-2 border-primary pb-3">
              <div>
                <p className="text-sm font-semibold text-primary">MatrizPro{configuracoes.nomeFazenda && ` · ${configuracoes.nomeFazenda}`}</p>
                <h2 className="text-xl font-bold text-foreground">{titulos[tipo]}</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Emitido em {formatarData(hojeISO())}
                {configuracoes.responsavel && ` · Responsável: ${configuracoes.responsavel}`}
                {configuracoes.cidade && ` · ${configuracoes.cidade}`}
              </p>
            </header>

            {tipo === "geral" && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { l: "Matrizes ativas", v: matrizes.filter((m) => m.status === "Ativa").length },
                    { l: "Gestantes", v: matrizes.filter((m) => m.status === "Ativa" && m.statusReprodutivo === "Gestante").length },
                    { l: "Lotes ativos", v: lotes.filter((l) => l.status === "Ativo").length },
                    { l: "Leitões ativos", v: linhas.reduce((a, { est }) => a + est.ativos, 0) },
                  ].map((k) => (
                    <div key={k.l} className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">{k.l}</p>
                      <p className="text-xl font-bold">{k.v}</p>
                    </div>
                  ))}
                </div>

                <SecaoTitulo>Matrizes</SecaoTitulo>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reprodutivo</TableHead>
                      <TableHead>Partos</TableHead>
                      <TableHead>Próximo parto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrizes.map((m) => {
                      const gestacao = m.ciclos.find((c) => c.status === "Em gestação");
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.identificador}</TableCell>
                          <TableCell>{m.status}</TableCell>
                          <TableCell>{m.statusReprodutivo}</TableCell>
                          <TableCell>{m.ciclos.filter((c) => c.dataParto).length}</TableCell>
                          <TableCell>{gestacao ? formatarData(gestacao.dataPrevistaParto) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <SecaoTitulo>Lotes</SecaoTitulo>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Matriz</TableHead>
                      <TableHead>Parto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>NV / NM</TableHead>
                      <TableHead>Ativos</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>GPD</TableHead>
                      <TableHead>Mortal.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map(({ lote, est }) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.nome}</TableCell>
                        <TableCell>{nomeMatriz(lote.matrizId)}</TableCell>
                        <TableCell>{formatarData(lote.dataParto)}</TableCell>
                        <TableCell>{lote.status}</TableCell>
                        <TableCell>
                          {lote.nascidosVivos} / {lote.nascidosMortos}
                        </TableCell>
                        <TableCell>{est.registrados > 0 ? est.ativos : "—"}</TableCell>
                        <TableCell>{est.ativos > 0 ? `${formatarNumero(est.pesoMedio, 2)} kg` : "—"}</TableCell>
                        <TableCell>{est.gpdMedio !== null ? `${Math.round(est.gpdMedio * 1000)} g` : "—"}</TableCell>
                        <TableCell>{est.registrados > 0 ? `${formatarNumero(est.mortalidadePercent)}%` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <SecaoTitulo>Alertas em aberto ({alertas.length})</SecaoTitulo>
                {alertas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum alerta.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {alertas.map((a) => (
                      <li key={a.id}>
                        <strong>{a.titulo}:</strong> {a.descricao}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {tipo === "lote" &&
              (loteSelecionado ? (
                <RelatorioLote lote={loteSelecionado} nomeMatriz={nomeMatriz(loteSelecionado.matrizId)} />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum lote cadastrado.</p>
              ))}

            {tipo === "financeiro" && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Custos</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Custo/kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map(({ lote, est }) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.nome}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(est.totalCustos)}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(est.totalReceitas)}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(est.saldo)}</TableCell>
                        <TableCell className="text-right">{est.custoPorKg !== null ? formatarMoeda(est.custoPorKg) : "—"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatarMoeda(linhas.reduce((a, { est }) => a + est.totalCustos, 0))}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(linhas.reduce((a, { est }) => a + est.totalReceitas, 0))}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(linhas.reduce((a, { est }) => a + est.saldo, 0))}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
                <SecaoTitulo>Investimento em matrizes</SecaoTitulo>
                <p className="text-sm">
                  {matrizes.length} matriz(es) · aquisição total de{" "}
                  <strong>{formatarMoeda(matrizes.reduce((a, m) => a + m.precoAquisicao, 0))}</strong>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RelatorioLote({ lote, nomeMatriz }: { lote: Lote; nomeMatriz: string }) {
  const est = estatisticasLote(lote);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          { l: "Matriz", v: nomeMatriz },
          { l: "Parto", v: formatarData(lote.dataParto) },
          { l: "Idade", v: `${est.idadeDias} dias` },
          { l: "Status", v: lote.status },
          { l: "Nascidos vivos / mortos", v: `${lote.nascidosVivos} / ${lote.nascidosMortos}` },
          { l: "Peso médio", v: est.ativos > 0 ? `${formatarNumero(est.pesoMedio, 2)} kg` : "—" },
          { l: "GPD médio", v: est.gpdMedio !== null ? `${Math.round(est.gpdMedio * 1000)} g/dia` : "—" },
          { l: "Mortalidade", v: `${formatarNumero(est.mortalidadePercent)}%` },
        ].map((k) => (
          <div key={k.l} className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className="font-semibold">{k.v}</p>
          </div>
        ))}
      </div>

      <SecaoTitulo>Leitões</SecaoTitulo>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Leitão</TableHead>
            <TableHead>Sexo</TableHead>
            <TableHead>Peso Nasc.</TableHead>
            <TableHead>Peso Atual</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Saúde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lote.leitoes.map((lt) => (
            <TableRow key={lt.id}>
              <TableCell className="font-medium">{lt.identificador}</TableCell>
              <TableCell>{lt.sexo}</TableCell>
              <TableCell>{formatarNumero(lt.pesoNascimento, 2)} kg</TableCell>
              <TableCell>{formatarNumero(lt.pesoAtual, 2)} kg</TableCell>
              <TableCell>{lt.status}</TableCell>
              <TableCell>{lt.statusSaude}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SecaoTitulo>Vacinas</SecaoTitulo>
      {lote.vacinasPendentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma vacina registrada.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lote.vacinasPendentes.map((v) => (
            <li key={v.id}>
              {v.nome} — agendada {formatarData(v.dataAgendada)}{" "}
              {v.aplicada ? `(aplicada ${formatarData(v.dataAplicacao)})` : "(pendente)"}
            </li>
          ))}
        </ul>
      )}

      <SecaoTitulo>Histórico de Saúde</SecaoTitulo>
      {lote.leitoes.every((lt) => lt.registrosSaude.length === 0) ? (
        <p className="text-sm text-muted-foreground">Nenhum registro de saúde.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lote.leitoes.flatMap((lt) =>
            lt.registrosSaude.map((r) => (
              <li key={r.id}>
                {formatarData(r.data)} · {lt.identificador}: {r.descricao}
                {r.medicamento && ` (${r.medicamento}${r.dose ? `, ${r.dose}` : ""})`}
              </li>
            ))
          )}
        </ul>
      )}

      <SecaoTitulo>Financeiro</SecaoTitulo>
      <p className="text-sm">
        Custos {formatarMoeda(est.totalCustos)} · Receitas {formatarMoeda(est.totalReceitas)} · Saldo{" "}
        <strong>{formatarMoeda(est.saldo)}</strong>
        {est.custoPorKg !== null && ` · Custo por kg produzido ${formatarMoeda(est.custoPorKg)}`}
      </p>
    </>
  );
}
