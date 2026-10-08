import { ReactNode, useMemo, useState } from "react";
import { BarChart3, Download, FileText, Layers, Printer, Wallet } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Lote } from "@/types";
import { formatarData, formatarMoeda, formatarNumero, hojeISO } from "@/lib/date";
import { estatisticasLote } from "@/utils/metricas";
import { gerarAlertasDinamicos } from "@/utils/alertGenerator";
import { agruparVendas, faturamentoPorMes, listarVendidos, resumirFaturamento } from "@/utils/faturamento";

type TipoRelatorio = "geral" | "lote" | "financeiro" | "faturamento";

const TIPOS: { id: TipoRelatorio; rotulo: string; icone: typeof FileText }[] = [
  { id: "geral", rotulo: "Geral do plantel", icone: FileText },
  { id: "lote", rotulo: "Por lote", icone: Layers },
  { id: "financeiro", rotulo: "Custos", icone: BarChart3 },
  { id: "faturamento", rotulo: "Faturamento", icone: Wallet },
];

/** Seções de cada relatório: o usuário escolhe quais ver (e imprimir). */
const SECOES: Record<TipoRelatorio, { id: string; rotulo: string }[]> = {
  geral: [
    { id: "resumo", rotulo: "Resumo" },
    { id: "matrizes", rotulo: "Matrizes" },
    { id: "lotes", rotulo: "Lotes" },
    { id: "alertas", rotulo: "Alertas" },
  ],
  lote: [
    { id: "resumo", rotulo: "Resumo" },
    { id: "leitoes", rotulo: "Leitões" },
    { id: "vacinas", rotulo: "Vacinas" },
    { id: "saude", rotulo: "Saúde" },
    { id: "financeiro", rotulo: "Financeiro" },
  ],
  financeiro: [
    { id: "resumo", rotulo: "Resumo" },
    { id: "lotes", rotulo: "Por lote" },
    { id: "investimento", rotulo: "Investimento" },
  ],
  faturamento: [
    { id: "resumo", rotulo: "Resumo" },
    { id: "meses", rotulo: "Por mês" },
    { id: "leitoes", rotulo: "Vendas de leitões" },
    { id: "descarte", rotulo: "Descarte" },
  ],
};

const SecaoTitulo = ({ children }: { children: ReactNode }) => (
  <h3 className="mb-2 mt-6 border-b pb-1 text-base font-bold text-foreground first:mt-0">{children}</h3>
);

const Indicadores = ({ itens }: { itens: { l: string; v: ReactNode }[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {itens.map((k) => (
      <div key={k.l} className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">{k.l}</p>
        <p className="text-lg font-bold">{k.v}</p>
      </div>
    ))}
  </div>
);

function baixarCSV(nome: string, linhas: (string | number)[][]) {
  const conteudo = linhas.map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
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
  const { matrizes, reprodutores, lotes, configuracoes } = useStore();
  const [tipo, setTipo] = useState<TipoRelatorio>("geral");
  const [secoes, setSecoes] = useState<string[]>(["resumo"]);
  const [loteId, setLoteId] = useState<string>("");
  const [ano, setAno] = useState(String(new Date().getFullYear()));

  const anos = useMemo(() => [...new Set(lotes.map((l) => l.dataParto.slice(0, 4)))].sort().reverse(), [lotes]);
  const doAno = (data: string) => ano === "todos" || data.startsWith(ano);

  // Lotes do ano escolhido (pela data do parto), do mais recente para o mais antigo
  const lotesAno = useMemo(
    () => lotes.filter((l) => doAno(l.dataParto)).sort((a, b) => b.dataParto.localeCompare(a.dataParto)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotes, ano]
  );
  const linhas = useMemo(() => lotesAno.map((l) => ({ lote: l, est: estatisticasLote(l) })), [lotesAno]);
  const loteSelecionado: Lote | undefined = lotes.find((l) => l.id === loteId) ?? lotesAno[0] ?? lotes[0];
  const alertas = useMemo(() => gerarAlertasDinamicos(lotes, matrizes, configuracoes), [lotes, matrizes, configuracoes]);
  const vendidos = useMemo(
    () => listarVendidos(lotes, matrizes, reprodutores).filter((i) => doAno(i.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotes, matrizes, reprodutores, ano]
  );

  const nomesMatrizes = useMemo(() => new Map(matrizes.map((m) => [m.id, m.identificador])), [matrizes]);
  const nomeMatriz = (id: string) => nomesMatrizes.get(id) ?? "—";
  const ver = (id: string) => secoes.includes(id);
  const todasSecoes = SECOES[tipo].map((s) => s.id);

  const trocarTipo = (novo: TipoRelatorio) => {
    setTipo(novo);
    setSecoes(["resumo"]);
  };

  const exportarCSV = () => {
    if (tipo === "lote" && loteSelecionado) {
      baixarCSV(`lote-${loteSelecionado.nome}-${hojeISO()}.csv`, [
        ["Leitão", "Sexo", "Peso nascimento (kg)", "Peso atual (kg)", "Situação", "Saúde", "Venda (R$)"],
        ...loteSelecionado.leitoes.map((lt) => [
          lt.identificador,
          lt.sexo,
          formatarNumero(lt.pesoNascimento, 2),
          formatarNumero(lt.pesoAtual, 2),
          lt.status,
          lt.statusSaude,
          lt.venda ? formatarNumero(lt.venda.valor, 2) : "",
        ]),
      ]);
    } else if (tipo === "financeiro") {
      baixarCSV(`custos-${hojeISO()}.csv`, [
        ["Lote", "Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"],
        ...lotesAno.flatMap((l) =>
          l.lancamentos.map((x) => [l.nome, formatarData(x.data), x.tipo, x.categoria, x.descricao, formatarNumero(x.valor, 2)])
        ),
      ]);
    } else if (tipo === "faturamento") {
      baixarCSV(`faturamento-${hojeISO()}.csv`, [
        ["Data", "Tipo", "Animal", "Lote", "Peso (kg)", "Comprador", "Valor (R$)"],
        ...vendidos.map((i) => [
          formatarData(i.data),
          i.tipo === "leitao" ? "Leitão" : i.tipo === "matriz" ? "Matriz" : "Reprodutor",
          i.animal,
          i.loteNome ?? "",
          i.pesoKg ? formatarNumero(i.pesoKg, 2) : "",
          i.comprador ?? "",
          formatarNumero(i.valor, 2),
        ]),
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

  const sufixoAno = ano === "todos" ? "" : ` — ${ano}`;
  const titulos: Record<TipoRelatorio, string> = {
    geral: `Relatório Geral do Plantel${sufixoAno}`,
    lote: `Relatório do Lote ${loteSelecionado?.nome ?? ""}`,
    financeiro: `Relatório de Custos${sufixoAno}`,
    faturamento: `Relatório de Faturamento${sufixoAno}`,
  };

  const semDados = lotes.length === 0 && matrizes.length === 0;
  const resumoFat = resumirFaturamento(vendidos);
  const vendas = agruparVendas(vendidos);

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={exportarCSV} disabled={semDados}>
            <Download className="h-4 w-4" /> CSV (Excel)
          </Button>
          <Button className="gap-2" onClick={() => window.print()} disabled={semDados}>
            <Printer className="h-4 w-4" /> Gerar PDF
          </Button>
        </div>
      </div>

      {/* 1) Qual relatório */}
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
        <ToggleGroup
          type="single"
          variant="outline"
          value={tipo}
          onValueChange={(v) => v && trocarTipo(v as TipoRelatorio)}
          className="flex-wrap justify-start"
          aria-label="Tipo de relatório"
        >
          {TIPOS.map((t) => (
            <ToggleGroupItem key={t.id} value={t.id} className="gap-2">
              <t.icone className="h-4 w-4" /> {t.rotulo}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {tipo !== "lote" ? (
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-36" aria-label="Ano">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!anos.includes(ano) && ano !== "todos" && <SelectItem value={ano}>{ano}</SelectItem>}
              {anos.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
              <SelectItem value="todos">Todos os anos</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          lotes.length > 0 && (
            <Select value={loteSelecionado?.id} onValueChange={setLoteId}>
              <SelectTrigger className="w-48" aria-label="Lote">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...lotes]
                  .sort((a, b) => b.dataParto.localeCompare(a.dataParto))
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )
        )}
      </div>

      {/* 2) Quais partes mostrar */}
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm text-muted-foreground">Mostrar:</span>
        <ToggleGroup
          type="multiple"
          size="sm"
          value={secoes}
          onValueChange={(v) => setSecoes(v.length > 0 ? v : ["resumo"])}
          className="flex-wrap justify-start"
          aria-label="Partes do relatório"
        >
          {SECOES[tipo].map((s) => (
            <ToggleGroupItem
              key={s.id}
              value={s.id}
              className="rounded-full border data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {s.rotulo}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSecoes(secoes.length === todasSecoes.length ? ["resumo"] : todasSecoes)}
        >
          {secoes.length === todasSecoes.length ? "Só o resumo" : "Tudo"}
        </Button>
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
              Prévia: o PDF sai com as partes marcadas acima. Em "Gerar PDF", escolha "Salvar como PDF".
            </p>
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b-2 border-primary pb-3">
              <div className="flex items-center gap-3">
                <img src="/logo-verde.png" alt="" className="h-12 w-12" />
                <div>
                  <p className="text-sm font-semibold text-primary">
                    MatrizPro{configuracoes.nomeFazenda && ` · ${configuracoes.nomeFazenda}`}
                  </p>
                  <h2 className="text-xl font-bold text-foreground">{titulos[tipo]}</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Emitido em {formatarData(hojeISO())}
                {configuracoes.responsavel && ` · Responsável: ${configuracoes.responsavel}`}
                {configuracoes.cidade && ` · ${configuracoes.cidade}`}
              </p>
            </header>

            {/* ------------------------------------------------------------------ GERAL */}
            {tipo === "geral" && (
              <>
                {ver("resumo") && (
                  <>
                    <SecaoTitulo>Resumo</SecaoTitulo>
                    <Indicadores
                      itens={[
                        { l: "Matrizes ativas", v: matrizes.filter((m) => m.status === "Ativa").length },
                        { l: "Gestantes", v: matrizes.filter((m) => m.status === "Ativa" && m.statusReprodutivo === "Gestante").length },
                        { l: "Lotes ativos", v: lotes.filter((l) => l.status === "Ativo").length },
                        { l: "Leitões ativos", v: lotes.reduce((a, l) => a + l.leitoes.filter((lt) => lt.status === "Ativo").length, 0) },
                        { l: "Lotes no ano", v: linhas.length },
                        { l: "Nascidos vivos no ano", v: linhas.reduce((a, { lote }) => a + lote.nascidosVivos, 0) },
                        { l: "Alertas em aberto", v: alertas.length },
                        { l: "Faturamento no ano", v: formatarMoeda(resumoFat.total) },
                      ]}
                    />
                  </>
                )}
                {ver("matrizes") && (
                  <>
                    <SecaoTitulo>Matrizes</SecaoTitulo>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Identificador</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Fase</TableHead>
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
                  </>
                )}
                {ver("lotes") && (
                  <>
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
                  </>
                )}
                {ver("alertas") && (
                  <>
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
              </>
            )}

            {/* ------------------------------------------------------------------ LOTE */}
            {tipo === "lote" &&
              (loteSelecionado ? (
                <RelatorioLote lote={loteSelecionado} nomeMatriz={nomeMatriz(loteSelecionado.matrizId)} ver={ver} />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum lote cadastrado.</p>
              ))}

            {/* ------------------------------------------------------------------ CUSTOS */}
            {tipo === "financeiro" && (
              <>
                {ver("resumo") && (
                  <>
                    <SecaoTitulo>Resumo</SecaoTitulo>
                    <Indicadores
                      itens={[
                        { l: "Custos", v: formatarMoeda(linhas.reduce((a, { est }) => a + est.totalCustos, 0)) },
                        { l: "Receitas", v: formatarMoeda(linhas.reduce((a, { est }) => a + est.totalReceitas, 0)) },
                        { l: "Saldo", v: formatarMoeda(linhas.reduce((a, { est }) => a + est.saldo, 0)) },
                        { l: "Lotes", v: linhas.length },
                      ]}
                    />
                  </>
                )}
                {ver("lotes") && (
                  <>
                    <SecaoTitulo>Por lote</SecaoTitulo>
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
                      </TableBody>
                    </Table>
                  </>
                )}
                {ver("investimento") && (
                  <>
                    <SecaoTitulo>Investimento em animais</SecaoTitulo>
                    <p className="text-sm">
                      Matrizes compradas: <strong>{matrizes.filter((m) => m.precoAquisicao > 0).length}</strong> · total{" "}
                      <strong>{formatarMoeda(matrizes.reduce((a, m) => a + m.precoAquisicao, 0))}</strong>
                      <br />
                      Reprodutores comprados: <strong>{reprodutores.filter((r) => (r.precoAquisicao ?? 0) > 0).length}</strong> · total{" "}
                      <strong>{formatarMoeda(reprodutores.reduce((a, r) => a + (r.precoAquisicao ?? 0), 0))}</strong>
                    </p>
                  </>
                )}
              </>
            )}

            {/* ------------------------------------------------------------------ FATURAMENTO */}
            {tipo === "faturamento" && (
              <>
                {ver("resumo") && (
                  <>
                    <SecaoTitulo>Resumo</SecaoTitulo>
                    <Indicadores
                      itens={[
                        { l: "Faturamento total", v: formatarMoeda(resumoFat.total) },
                        { l: "Leitões vendidos", v: `${resumoFat.leitoes.quantidade} · ${formatarMoeda(resumoFat.leitoes.valor)}` },
                        {
                          l: "Preço médio do leitão",
                          v: resumoFat.leitoes.precoMedio !== null ? formatarMoeda(resumoFat.leitoes.precoMedio) : "—",
                        },
                        { l: "Descarte vendido", v: `${resumoFat.descarte.quantidade} · ${formatarMoeda(resumoFat.descarte.valor)}` },
                      ]}
                    />
                  </>
                )}
                {ver("meses") && (
                  <>
                    <SecaoTitulo>Por mês</SecaoTitulo>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Leitões</TableHead>
                          <TableHead className="text-right">Descarte</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faturamentoPorMes(vendidos).map((m) => (
                          <TableRow key={m.mes}>
                            <TableCell>{`${m.mes.slice(5, 7)}/${m.mes.slice(0, 4)}`}</TableCell>
                            <TableCell className="text-right">{formatarMoeda(m.leitoes)}</TableCell>
                            <TableCell className="text-right">{formatarMoeda(m.descarte)}</TableCell>
                            <TableCell className="text-right font-medium">{formatarMoeda(m.leitoes + m.descarte)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
                {(["leitoes", "descarte"] as const).map(
                  (parte) =>
                    ver(parte) && (
                      <div key={parte}>
                        <SecaoTitulo>{parte === "leitoes" ? "Vendas de leitões" : "Vendas de descarte"}</SecaoTitulo>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>{parte === "leitoes" ? "Lote" : "Animal"}</TableHead>
                              <TableHead>Qtd.</TableHead>
                              <TableHead>Comprador</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendas
                              .filter((v) => (parte === "leitoes" ? v.tipo === "leitao" : v.tipo !== "leitao"))
                              .map((v) => (
                                <TableRow key={v.vendaId}>
                                  <TableCell>{formatarData(v.data)}</TableCell>
                                  <TableCell>{v.tipo === "leitao" ? v.loteNome : v.itens[0].animal}</TableCell>
                                  <TableCell>{v.quantidade}</TableCell>
                                  <TableCell>{v.comprador || "—"}</TableCell>
                                  <TableCell className="text-right">{formatarMoeda(v.valor)}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RelatorioLote({ lote, nomeMatriz, ver }: { lote: Lote; nomeMatriz: string; ver: (id: string) => boolean }) {
  const est = estatisticasLote(lote);
  return (
    <>
      {ver("resumo") && (
        <>
          <SecaoTitulo>Resumo</SecaoTitulo>
          <Indicadores
            itens={[
              { l: "Matriz", v: nomeMatriz },
              { l: "Parto", v: formatarData(lote.dataParto) },
              { l: "Idade", v: `${est.idadeDias} dias` },
              { l: "Status", v: lote.status },
              { l: "Nascidos vivos / mortos", v: `${lote.nascidosVivos} / ${lote.nascidosMortos}` },
              { l: "Peso médio", v: est.ativos > 0 ? `${formatarNumero(est.pesoMedio, 2)} kg` : "—" },
              { l: "GPD médio", v: est.gpdMedio !== null ? `${Math.round(est.gpdMedio * 1000)} g/dia` : "—" },
              { l: "Mortalidade", v: `${formatarNumero(est.mortalidadePercent)}%` },
            ]}
          />
        </>
      )}

      {ver("leitoes") && (
        <>
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
                  <TableCell>
                    {lt.status}
                    {lt.venda && ` · ${formatarMoeda(lt.venda.valor)}`}
                  </TableCell>
                  <TableCell>{lt.statusSaude}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {ver("vacinas") && (
        <>
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
        </>
      )}

      {ver("saude") && (
        <>
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
                    {r.custo ? ` · ${formatarMoeda(r.custo)}` : ""}
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}

      {ver("financeiro") && (
        <>
          <SecaoTitulo>Financeiro</SecaoTitulo>
          <Indicadores
            itens={[
              { l: "Custos", v: formatarMoeda(est.totalCustos) },
              { l: "Vendas de leitões", v: formatarMoeda(est.receitaVendas) },
              { l: "Saldo", v: formatarMoeda(est.saldo) },
              { l: "Custo por kg", v: est.custoPorKg !== null ? formatarMoeda(est.custoPorKg) : "—" },
            ]}
          />
        </>
      )}
    </>
  );
}
