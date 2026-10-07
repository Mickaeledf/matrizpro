import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Rótulo + controle + mensagem de erro/ajuda de um campo de formulário. */
export function Campo({
  label,
  erro,
  ajuda,
  children,
}: {
  label: string;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {erro ? (
        <p className="text-xs text-destructive">{erro}</p>
      ) : ajuda ? (
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
    </div>
  );
}

