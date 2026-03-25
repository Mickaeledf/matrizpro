import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Scale, TrendingUp, DollarSign, AlertCircle, Syringe, Bell, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const alertIcons: Record<string, typeof AlertCircle> = {
  baixo_peso: TrendingDown,
  vacinacao: Syringe,
  pesagem: Bell,
  reforco: Syringe,
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

export default function DashboardPage() {
  const { matrizes, lotes, alertas } = useStore();

  const totalLeitoesAtivos = lotes
    .filter((l) => l.status === "Ativo")
    .reduce((acc, l) => acc + l.nascidosVivos, 0);

  const pesoMedio = 0;
  const margemLucro = 28.5;
  const custoMedio = 22.5;

  const kpis = [
    { label: "Total de Leitões Ativos", value: totalLeitoesAtivos.toString(), sub: totalLeitoesAtivos === 0 ? "Nenhum lote ativo" : `${lotes.filter(l => l.status === 'Ativo').length} lotes`, icon: Layers },
    { label: "Peso Médio", value: `${pesoMedio} kg`, sub: "Entre todos os leitões ativos", icon: Scale },
    { label: "Margem de Lucro Estimada", value: `${margemLucro}%`, sub: "Custo estimado (Em breve)", icon: TrendingUp },
    { label: "Custo Médio por Animal", value: `R$ ${custoMedio.toFixed(2)}`, sub: "Custo estimado (Em breve)", icon: DollarSign },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Olá! Bem-vindo de volta.</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground leading-tight">{kpi.label}</p>
                    <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart placeholder */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground">Desempenho do Lote</h2>
              <p className="text-sm text-muted-foreground mb-8">Comparação do Ganho de Peso Diário Médio (GPD)</p>
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados de desempenho para exibir.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas */}
        <div>
          <Card className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-bold text-foreground">Alertas Automatizados</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Notificações críticas para as operações da sua fazenda.</p>

              <div className="space-y-3">
                {alertas.map((alerta) => {
                  const Icon = alertIcons[alerta.tipo] || AlertCircle;
                  return (
                    <div
                      key={alerta.id}
                      className={cn("rounded-lg p-3", alertColors[alerta.severidade])}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", alertTitleColors[alerta.severidade])} />
                        <div>
                          <p className={cn("text-sm font-semibold", alertTitleColors[alerta.severidade])}>
                            {alerta.titulo}
                          </p>
                          <p className="text-xs text-foreground/80 mt-0.5">{alerta.descricao}</p>
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
