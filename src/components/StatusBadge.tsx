import { cn } from "@/lib/utils";

type Tom = "success" | "warning" | "destructive" | "info" | "muted";

const tons: Record<Tom, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  muted: "bg-muted text-muted-foreground",
};

const tomPorStatus: Record<string, Tom> = {
  // Lote
  Ativo: "success",
  Desmamado: "info",
  Vendido: "muted",
  Finalizado: "muted",
  // Matriz
  Ativa: "success",
  Inativa: "warning",
  Descartada: "destructive",
  // Reprodutivo
  Vazia: "muted",
  Gestante: "info",
  Lactante: "success",
  Desmamada: "warning",
  // Ciclo
  "Em gestação": "info",
  Parida: "success",
  Falhou: "destructive",
  // Reprodutor
  Inativo: "warning",
  Descartado: "destructive",
  // Leitão
  Morto: "destructive",
  // Saúde
  Saudável: "success",
  "Em observação": "info",
  "Em tratamento": "warning",
  Crítico: "destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tom = tomPorStatus[status] ?? "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tons[tom],
        className
      )}
    >
      {status}
    </span>
  );
}
