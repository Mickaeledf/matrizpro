import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Configurações</h1>
      <Card className="border border-border max-w-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Configurações da Fazenda</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            As configurações do sistema estarão disponíveis em breve, incluindo dados da fazenda, unidades de medida e preferências de notificação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
