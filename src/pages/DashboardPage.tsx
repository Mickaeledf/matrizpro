import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Layers, Scale, GitBranch, AlertCircle, Syringe, Bell, TrendingDown, Heart, Skull, Baby, Milk } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatarNumero } from "@/lib/date";
import { gerarAlertasDinamicos, gerarAlertasPadrao } from "@/utils/alertGenerator";
import { estatisticasLote } from "@/utils/metricas";

const alertIcons: Record<string, typeof AlertCircle> = {
  baixo_peso: TrendingDown,
  vacinacao: Syringe,
  pesagem: Bell,
  reforco: Syringe,
  saude: Heart,
  mortalidade: Skull,
  parto: Baby,
  desmame: Milk,
};

const alertColors: Record<string, string> = {
  critical: "border-l-4 border-l-destructive bg-destructive/5",
  warning: "border-l-4 border-l-warning bg-warning/5",
  info: "border-l-4 border-l-info bg-info/5",
};

const alertTitleColors: Record<string, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-info",
};

const chartConfig = {
  gpd: { label: "GPD (g/dia)", color: "hsl(var(--primary))" },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { matrizes, lotes, configuracoes } = useStore();

  const alertas = useMemo(() => {
    const temDados = matrizes.length > 0 || lotes.length > 0;
    const dinamicos = gerarAlertasDinamicos(lotes, matrizes, configuracoes);
    return dinamicos.length > 0 || temDados ? dinamicos : gerarAlertasPadrao();
  }, [lotes, matrizes, configuracoes]);

  const lotesAtivos = useMemo(() => lotes.filter((l) => l.status === "Ativo"), [lotes]);

  // Lotes sem leitões cadastrados contam pelos nascidos vivos (estimativa)
  let estimados = 0;
  const totalLeitoesAtivos = lotesAtivos.reduce((acc, l) => {
    if (l.leitoes.length > 0) return acc + l.leitoes.filter((lt) => lt.status === "Ativo").length;
    estimados += l.nascidosVivos;
    return acc + l.nascidosVivos;
  }, 0);

  const todosLeitoes = lotesAtivos.flatMap((l) => l.leitoes).filter((lt) => lt.status === "Ativo");
  const pesoMedio =
    todosLeitoes.length > 0 ? todosLeitoes.reduce((a, lt) => a + lt.pesoAtual, 0) / todosLeitoes.length : 0;

  const animaisCriticos = todosLeitoes.filter((lt) => lt.statusSaude === "Crítico" || lt.statusSaude === "Em tratamento").length;
  const animaisSaudaveis = todosLeitoes.filter((lt) => lt.statusSaude === "Saudável").length;
  const matrizesAtivas = matrizes.filter((m) => m.status === "Ativa");

  const dadosGPD = useMemo(
    () =>
      lotesAtivos
        .map((l) => ({ lote: l.nome, gpd: estatisticasLote(l).gpdMedio }))
        .filter((d): d is { lote: string; gpd: number } => d.gpd !== null)
        .map((d) => ({ ...d, gpd: Math.round(d.gpd * 1000) })),
    [lotesAtivos]
  );

  const kpis = [
    {
      label: "Total de Leitões Ativos",
      value: totalLeitoesAtivos.toString(),
      sub:
        lotesAtivos.length === 0
          ? "Nenhum lote ativo"
          : `${lotesAtivos.length} lote(s) ativo(s)${estimados > 0 ? ` · ${estimados} sem cadastro individual` : ""}`,
      icon: Layers,
      link: "/lotes",
    },
    {
      label: "Peso Médio",
      value: `${formatarNumero(pesoMedio)} kg`,
      sub: todosLeitoes.length > 0 ? `${todosLeitoes.length} leitões acompanhados` : "Cadastre leitões para acompanhar",
      icon: Scale,
      link: "/analise",
    },
    {
      label: "Saúde do Rebanho",
      value: animaisCriticos > 0 ? `${animaisCriticos} alerta(s)` : "Estável",
      sub: todosLeitoes.length > 0 ? `${animaisSaudaveis}/${todosLeitoes.length} saudáveis` : "Sem animais cadastrados",
      icon: Heart,
      link: "/lotes",
    },
    {
      label: "Matrizes Ativas",
      value: matrizesAtivas.length.toString(),
      sub: `${matrizesAtivas.filter((m) => m.statusReprodutivo === "Gestante").length} gestante(s) · ${matrizesAtivas.filter((m) => m.statusReprodutivo === "Lactante").length} lactante(s)`,
      icon: GitBranch,
      link: "/matrizes",
    },
  ];

  const saudacao = configuracoes.responsavel ? `Olá, ${configuracoes.responsavel}!` : "Olá! Bem-vindo de volta.";

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{saudacao}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Card
                key={kpi.label}
                className="cursor-pointer border border-border transition-shadow hover:shadow-md"
                onClick={() => navigate(kpi.link)}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <p className="text-xs font-medium leading-tight text-muted-foreground">{kpi.label}</p>
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Desempenho dos Lotes Ativos</h2>
                  <p className="text-sm text-muted-foreground">Ganho de Peso Diário médio (GPD) por lote</p>
                </div>
                <button className="text-sm text-primary hover:underline" onClick={() => navigate("/analise")}>
                  Ver análise completa →
                </button>
              </div>
              {dadosGPD.length === 0 ? (
                <div className="flex h-48 items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground">
                    {todosLeitoes.length === 0
                      ? "Cadastre leitões com pesagens para ver o gráfico de desempenho."
                      : "Registre pesagens dos leitões para calcular o GPD."}
                  </p>
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={dadosGPD} margin={{ left: -10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="lote" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="gpd" fill="var(--color-gpd)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border border-border">
            <CardContent className="p-5">
              <div className="mb-1 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-bold text-foreground">Alertas Automatizados</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">Notificações baseadas nos dados cadastrados.</p>

              <div className="max-h-[500px] space-y-3 overflow-y-auto">
                {alertas.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum alerta no momento. Tudo em dia!</p>
                )}
                {alertas.map((alerta) => {
                  const Icon = alertIcons[alerta.tipo] || AlertCircle;
                  return (
                    <div
                      key={alerta.id}
                      className={cn("cursor-pointer rounded-lg p-3 transition-shadow hover:shadow-sm", alertColors[alerta.severidade])}
                      onClick={() => navigate(alerta.link || "/lotes")}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", alertTitleColors[alerta.severidade])} />
                        <div>
                          <p className={cn("text-sm font-semibold", alertTitleColors[alerta.severidade])}>{alerta.titulo}</p>
                          <p className="mt-0.5 text-xs text-foreground/80">{alerta.descricao}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
