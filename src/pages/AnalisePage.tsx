import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { StatusBadge } from "@/components/StatusBadge";
import { diasEntre, formatarMoeda, formatarNumero } from "@/lib/date";
import { estatisticasLote } from "@/utils/metricas";
import { cn } from "@/lib/utils";
import { Paginacao, usePaginacao } from "@/components/Paginacao";

/** Os gráficos mostram só os lotes mais recentes (com centenas de lotes as barras ficariam ilegíveis). */
const MAX_LOTES_GRAFICO = 24;

const Vazio = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-64 items-center justify-center">
    <p className="text-center text-sm text-muted-foreground">{children}</p>
  </div>
);

const coresSaude: Record<string, string> = {
  Saudável: "hsl(var(--success))",
  "Em observação": "hsl(var(--info))",
  "Em tratamento": "hsl(var(--warning))",
  Crítico: "hsl(var(--destructive))",
};

export default function AnalisePage() {
  const navigate = useNavigate();
  const { lotes } = useStore();
  const [filtro, setFiltro] = useState("todos");
  const [loteCrescimento, setLoteCrescimento] = useState<string>("");

  const lotesFiltrados = useMemo(
    () =>
      lotes
        .filter((l) => filtro === "todos" || (filtro === "ativos" ? l.status === "Ativo" : l.status !== "Ativo"))
        .sort((a, b) => a.dataParto.localeCompare(b.dataParto)),
    [lotes, filtro]
  );

  const linhas = useMemo(() => lotesFiltrados.map((l) => ({ lote: l, est: estatisticasLote(l) })), [lotesFiltrados]);

  const dadosDesempenho = linhas.slice(-MAX_LOTES_GRAFICO).map(({ lote, est }) => ({
    lote: lote.nome,
    pesoMedio: Number(est.pesoMedio.toFixed(2)),
    gpd: est.gpdMedio !== null ? Math.round(est.gpdMedio * 1000) : 0,
    mortalidade: Number(est.mortalidadePercent.toFixed(1)),
  }));

  // --- Crescimento individual ---
  const lotesComPesagem = useMemo(
    () =>
      lotes
        .filter((l) => l.leitoes.some((lt) => lt.pesagens.length > 0))
        .sort((a, b) => b.dataParto.localeCompare(a.dataParto))
        .slice(0, 60),
    [lotes]
  );
  const loteSelecionado = lotes.find((l) => l.id === loteCrescimento) ?? lotesComPesagem[0];

  const crescimento = useMemo(() => {
    if (!loteSelecionado) return { dados: [], leitoes: [] as { id: string; nome: string }[] };
    const porDia = new Map<number, Record<string, number>>();
    const leitoes = loteSelecionado.leitoes.filter((lt) => lt.status !== "Morto");
    leitoes.forEach((lt) => {
      const pontos = [
        { dia: 0, peso: lt.pesoNascimento },
        ...lt.pesagens.map((p) => ({ dia: diasEntre(lt.dataNascimento, p.data), peso: p.peso })),
      ];
      pontos.forEach(({ dia, peso }) => {
        const linha = porDia.get(dia) ?? {};
        linha[lt.id] = peso;
        porDia.set(dia, linha);
      });
    });
    const dados = [...porDia.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dia, pesos]) => {
        const valores = Object.values(pesos);
        return { dia, ...pesos, media: Number((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)) };
      });
    return { dados, leitoes: leitoes.map((lt) => ({ id: lt.id, nome: lt.identificador })) };
  }, [loteSelecionado]);

  const configCrescimento = useMemo(
    () => ({
      media: { label: "Média do lote", color: "hsl(var(--primary))" },
      ...Object.fromEntries(
        crescimento.leitoes.map((lt, i) => [
          lt.id,
          { label: lt.nome, color: `hsl(${(i * 47) % 360} 55% 55%)` },
        ])
      ),
    }),
    [crescimento.leitoes]
  );

  // --- Custos e saúde ---
  const dadosCustos = linhas
    .slice(-MAX_LOTES_GRAFICO)
    .filter(({ est }) => est.totalCustos > 0 || est.totalReceitas > 0)
    .map(({ lote, est }) => ({ lote: lote.nome, custos: est.totalCustos, receitas: est.totalReceitas }));

  const distribuicaoSaude = useMemo(() => {
    const contagem: Record<string, number> = {};
    lotesFiltrados
      .flatMap((l) => l.leitoes)
      .filter((lt) => lt.status === "Ativo")
      .forEach((lt) => {
        contagem[lt.statusSaude] = (contagem[lt.statusSaude] || 0) + 1;
      });
    return Object.entries(contagem).map(([status, quantidade]) => ({ status, quantidade }));
  }, [lotesFiltrados]);

  // Tabelas em ordem do mais recente para o mais antigo, paginadas
  const linhasRecentes = useMemo(() => [...linhas].reverse(), [linhas]);
  const pagDesempenho = usePaginacao(linhasRecentes, 30);
  const pagCustos = usePaginacao(linhasRecentes, 30);

  const totalCustos = linhas.reduce((a, { est }) => a + est.totalCustos, 0);
  const totalReceitas = linhas.reduce((a, { est }) => a + est.totalReceitas, 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Análise Comparativa</h1>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            <SelectItem value="ativos">Somente ativos</SelectItem>
            <SelectItem value="encerrados">Desmamados/encerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="desempenho" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start bg-muted">
          <TabsTrigger value="desempenho" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Desempenho do Lote
          </TabsTrigger>
          <TabsTrigger value="crescimento" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Crescimento Individual
          </TabsTrigger>
          <TabsTrigger value="custos" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Custos e Saúde
          </TabsTrigger>
        </TabsList>

        <TabsContent value="desempenho" className="space-y-4">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-lg font-bold text-foreground">Comparativo de Desempenho entre Lotes</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Peso médio, ganho de peso diário (GPD) e taxa de mortalidade. Os gráficos mostram até os 24 lotes mais recentes do filtro.
              </p>
              {linhas.length === 0 ? (
                <Vazio>Sem dados de lotes para exibir. Adicione lotes e leitões para começar a análise.</Vazio>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium">GPD médio (g/dia)</p>
                    <ChartContainer config={{ gpd: { label: "GPD (g/dia)", color: "hsl(var(--primary))" } }} className="h-56 w-full">
                      <BarChart data={dadosDesempenho} margin={{ left: -10 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="lote" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="gpd" fill="var(--color-gpd)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Mortalidade (%)</p>
                    <ChartContainer
                      config={{ mortalidade: { label: "Mortalidade (%)", color: "hsl(var(--destructive))" } }}
                      className="h-56 w-full"
                    >
                      <BarChart data={dadosDesempenho} margin={{ left: -10 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="lote" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="mortalidade" fill="var(--color-mortalidade)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {linhas.length > 0 && (
            <Card className="border border-border">
              <CardContent className="p-4 sm:p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Nascidos Vivos</TableHead>
                      <TableHead>Natimortos</TableHead>
                      <TableHead>Ativos</TableHead>
                      <TableHead>Peso Médio</TableHead>
                      <TableHead>GPD</TableHead>
                      <TableHead>Mortalidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagDesempenho.visiveis.map(({ lote, est }) => (
                      <TableRow key={lote.id} className="cursor-pointer" onClick={() => navigate(`/lotes/${lote.id}`)}>
                        <TableCell className="font-medium">{lote.nome}</TableCell>
                        <TableCell>
                          <StatusBadge status={lote.status} />
                        </TableCell>
                        <TableCell>{est.idadeDias} d</TableCell>
                        <TableCell>{lote.nascidosVivos}</TableCell>
                        <TableCell>{formatarNumero(est.natimortalidadePercent)}%</TableCell>
                        <TableCell>{est.registrados > 0 ? est.ativos : "—"}</TableCell>
                        <TableCell>{est.ativos > 0 ? `${formatarNumero(est.pesoMedio, 2)} kg` : "—"}</TableCell>
                        <TableCell>{est.gpdMedio !== null ? `${Math.round(est.gpdMedio * 1000)} g` : "—"}</TableCell>
                        <TableCell className={cn(est.mortalidadePercent >= 10 && "font-semibold text-destructive")}>
                          {est.registrados > 0 ? `${formatarNumero(est.mortalidadePercent)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Paginacao {...pagDesempenho} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="crescimento">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Crescimento Individual dos Leitões</h2>
                  <p className="text-sm text-muted-foreground">Peso (kg) por idade (dias). A linha grossa é a média do lote.</p>
                </div>
                {lotesComPesagem.length > 0 && (
                  <Select value={loteSelecionado?.id} onValueChange={setLoteCrescimento}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotesComPesagem.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {!loteSelecionado || crescimento.dados.length < 2 ? (
                <Vazio>Sem dados de leitões para exibir. Adicione pesagens para começar o acompanhamento.</Vazio>
              ) : (
                <ChartContainer config={configCrescimento} className="h-80 w-full">
                  <LineChart data={crescimento.dados} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="dia"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(d) => `${d}d`}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Dia ${p?.[0]?.payload?.dia}`} />} />
                    {crescimento.leitoes.map((lt) => (
                      <Line
                        key={lt.id}
                        dataKey={lt.id}
                        type="monotone"
                        stroke={`var(--color-${lt.id})`}
                        strokeWidth={1}
                        strokeOpacity={0.6}
                        dot={false}
                        connectNulls
                      />
                    ))}
                    <Line dataKey="media" type="monotone" stroke="var(--color-media)" strokeWidth={3} dot connectNulls />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card className="border border-border">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg font-bold text-foreground">Custos x Receitas por Lote</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Total no período: custos {formatarMoeda(totalCustos)} · receitas {formatarMoeda(totalReceitas)}
                </p>
                {dadosCustos.length === 0 ? (
                  <Vazio>Sem dados suficientes para análise de custos. Lance custos e receitas na aba "Financeiro" de cada lote.</Vazio>
                ) : (
                  <ChartContainer
                    config={{
                      custos: { label: "Custos", color: "hsl(var(--destructive))" },
                      receitas: { label: "Receitas", color: "hsl(var(--success))" },
                    }}
                    className="h-64 w-full"
                  >
                    <BarChart data={dadosCustos} margin={{ left: 10 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="lote" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="custos" fill="var(--color-custos)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="receitas" fill="var(--color-receitas)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg font-bold text-foreground">Saúde do Plantel</h2>
                <p className="mb-4 text-sm text-muted-foreground">Leitões ativos por status de saúde.</p>
                {distribuicaoSaude.length === 0 ? (
                  <Vazio>Nenhum leitão ativo cadastrado.</Vazio>
                ) : (
                  <ChartContainer
                    config={{ quantidade: { label: "Leitões" } }}
                    className="mx-auto aspect-square h-64"
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                      <Pie data={distribuicaoSaude} dataKey="quantidade" nameKey="status" innerRadius={50} strokeWidth={2}>
                        {distribuicaoSaude.map((d) => (
                          <Cell key={d.status} fill={coresSaude[d.status]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {linhas.some(({ est }) => est.totalCustos > 0 || est.totalReceitas > 0) && (
            <Card className="border border-border">
              <CardContent className="p-4 sm:p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead className="text-right">Custos</TableHead>
                      <TableHead className="text-right">Custos de Saúde</TableHead>
                      <TableHead className="text-right">Receitas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Custo/kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagCustos.visiveis.map(({ lote, est }) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.nome}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(est.totalCustos)}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(est.custosSaude)}</TableCell>
                        <TableCell className="text-right">{formatarMoeda(est.totalReceitas)}</TableCell>
                        <TableCell className={cn("text-right font-medium", est.saldo < 0 ? "text-destructive" : "text-success")}>
                          {formatarMoeda(est.saldo)}
                        </TableCell>
                        <TableCell className="text-right">{est.custoPorKg !== null ? formatarMoeda(est.custoPorKg) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Paginacao {...pagCustos} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
