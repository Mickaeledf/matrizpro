import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Scale, TrendingUp, DollarSign, AlertCircle, Syringe, Bell, TrendingDown, Heart, Skull } from "lucide-react";
import { cn } from "@/lib/utils";
import { gerarAlertasDinamicos, gerarAlertasPadrao } from "@/utils/alertGenerator";

const alertIcons: Record<string, typeof AlertCircle> = {
  baixo_peso: TrendingDown,
  vacinacao: Syringe,
  pesagem: Bell,
  reforco: Syringe,
  saude: Heart,
  mortalidade: Skull,
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
  const navigate = useNavigate();
  const { matrizes, lotes } = useStore();

  const alertas = useMemo(() => {
    const dinamicos = gerarAlertasDinamicos(lotes, matrizes);
    return dinamicos.length > 0 ? dinamicos : gerarAlertasPadrao();
  }, [lotes, matrizes]);

  const lotesAtivos = lotes.filter((l) => l.status === "Ativo");
  const totalLeitoesAtivos = lotesAtivos.reduce((acc, l) => {
    const letoesAtivos = l.leitoes?.filter(lt => lt.status === 'Ativo').length || 0;
    return acc + (letoesAtivos > 0 ? letoesAtivos : l.nascidosVivos);
  }, 0);

  const todosLeitoes = lotes.flatMap(l => l.leitoes || []).filter(lt => lt.status === 'Ativo');
  const pesoMedio = todosLeitoes.length > 0
    ? (todosLeitoes.reduce((a, lt) => a + lt.pesoAtual, 0) / todosLeitoes.length).toFixed(1)
    : "0";

  const animaisCriticos = todosLeitoes.filter(lt => lt.statusSaude === 'Crítico' || lt.statusSaude === 'Em tratamento').length;
  const animaisSaudaveis = todosLeitoes.filter(lt => lt.statusSaude === 'Saudável').length;

  const kpis = [
    {
      label: "Total de Leitões Ativos",
      value: totalLeitoesAtivos.toString(),
      sub: totalLeitoesAtivos === 0 ? "Nenhum lote ativo" : `${lotesAtivos.length} lote(s) ativo(s)`,
      icon: Layers,
      link: "/lotes",
    },
    {
      label: "Peso Médio",
      value: `${pesoMedio} kg`,
      sub: todosLeitoes.length > 0 ? `${todosLeitoes.length} leitões pesados` : "Cadastre leitões para acompanhar",
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
      value: matrizes.filter(m => m.status === 'Ativa').length.toString(),
      sub: `${matrizes.filter(m => m.statusReprodutivo === 'Gestante').length} gestante(s)`,
      icon: TrendingUp,
      link: "/matrizes",
    },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Olá! Bem-vindo de volta.</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <Card
                key={kpi.label}
                className="border border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(kpi.link)}
              >
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
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/analise")}>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground">Desempenho do Lote</h2>
              <p className="text-sm text-muted-foreground mb-8">Comparação do Ganho de Peso Diário Médio (GPD)</p>
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  {todosLeitoes.length === 0
                    ? "Cadastre leitões com pesagens para ver o gráfico de desempenho."
                    : "Sem dados de desempenho para exibir."}
                </p>
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
              <p className="text-sm text-muted-foreground mb-4">Notificações baseadas nos dados cadastrados.</p>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {alertas.map((alerta) => {
                  const Icon = alertIcons[alerta.tipo] || AlertCircle;
                  return (
                    <div
                      key={alerta.id}
                      className={cn("rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow", alertColors[alerta.severidade])}
                      onClick={() => navigate(alerta.link || "/lotes")}
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
