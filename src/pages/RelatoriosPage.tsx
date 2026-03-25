import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Relatórios</h1>

      <div className="flex items-center justify-center py-16">
        <Card className="border border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Geração de Relatórios em PDF em Breve</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Em breve você poderá gerar e baixar relatórios detalhados em PDF para métricas de crescimento e financeiras com base nos dados inseridos.
            </p>
            <p className="text-sm text-primary font-medium">Fique atento a este poderoso recurso!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
