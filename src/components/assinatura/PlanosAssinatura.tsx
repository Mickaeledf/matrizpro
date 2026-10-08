import { Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NEGOCIO, PLANOS, PlanoPago, economiaSemestral, moeda } from "@/config/negocio";
import { cn } from "@/lib/utils";

/** Cartões dos planos Mensal e Semestral, cada um com seu link de pagamento. */
export function PlanosAssinatura({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={cn("grid gap-3", compacto ? "sm:grid-cols-2" : "md:grid-cols-2")}>
      {(Object.keys(PLANOS) as PlanoPago[]).map((p) => {
        const plano = PLANOS[p];
        const link = NEGOCIO.linksPagamento[p];
        const destaque = p === "semestral";
        return (
          <div
            key={p}
            className={cn(
              "relative flex flex-col rounded-lg border p-4 text-left",
              destaque ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            {destaque && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                1 mês grátis
              </span>
            )}
            <p className="text-sm font-semibold text-foreground">{plano.nome}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{moeda(plano.valor)}</p>
            <p className="text-xs text-muted-foreground">
              {p === "mensal" ? "por mês" : `por 6 meses (equivale a ${moeda(plano.valor / 6)}/mês)`}
            </p>
            {!compacto && (
              <ul className="mt-3 flex-1 space-y-1 text-sm text-foreground/90">
                <li className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" /> {plano.descricao}
                </li>
                {destaque && (
                  <li className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-success" /> Economia de {moeda(economiaSemestral())}
                  </li>
                )}
              </ul>
            )}
            {link ? (
              <Button asChild className="mt-3 gap-2" variant={destaque ? "default" : "outline"}>
                <a href={link} target="_blank" rel="noreferrer">
                  <CreditCard className="h-4 w-4" /> Assinar {plano.nome.toLowerCase()}
                </a>
              </Button>
            ) : (
              <Button disabled className="mt-3 gap-2" variant="outline">
                <CreditCard className="h-4 w-4" /> Pagamento online em breve
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
