import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";

export default function AnalisePage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Análise Comparativa</h1>

      <Tabs defaultValue="desempenho" className="space-y-4">
        <TabsList className="w-full justify-start bg-muted">
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

        <TabsContent value="desempenho">
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground">Comparativo de Desempenho entre Lotes</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Analise o peso médio, a taxa de mortalidade e o ganho de peso diário (GPD).
              </p>
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sem dados de lotes para exibir. Adicione lotes e leitões para começar a análise.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crescimento">
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground">Crescimento Individual dos Leitões</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Acompanhe o crescimento individual de cada leitão ao longo do tempo.
              </p>
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sem dados de leitões para exibir. Adicione pesagens para começar o acompanhamento.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos">
          <Card className="border border-border">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground">Custos e Saúde</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Análise de custos por lote e indicadores de saúde do plantel.
              </p>
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Sem dados suficientes para análise de custos. Adicione dados financeiros aos lotes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
