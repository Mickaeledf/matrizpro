import { useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NEGOCIO, PLANOS, PlanoPago, economiaSemestral, moeda } from "@/config/negocio";
import { cn } from "@/lib/utils";
import { iniciarPagamento } from "@/lib/pagamentos";

/**
 * Cartões dos planos Mensal e Semestral. "Assinar" leva ao Mercado Pago (PIX, cartão ou boleto);
 * o plano é liberado sozinho assim que o pagamento é confirmado.
 */
export function PlanosAssinatura({ compacto = false }: { compacto?: boolean }) {
  const [abrindo, setAbrindo] = useState<PlanoPago | null>(null);

  const assinar = async (p: PlanoPago) => {
    setAbrindo(p);
    const r = await iniciarPagamento(p);
    if (r.dados?.url) {
      window.location.href = r.dados.url;
      return;
    }
    setAbrindo(null);
    // Reserva: pagamento online ainda não ativado, mas existe link avulso
    const reserva = NEGOCIO.linksPagamento[p];
    if (r.naoConfigurado && reserva) window.open(reserva, "_blank", "noreferrer");
    else toast.error(r.erro ?? "Não foi possível abrir o pagamento.");
  };

  return (
    <div className={cn("grid gap-3", compacto ? "sm:grid-cols-2" : "md:grid-cols-2")}>
      {(Object.keys(PLANOS) as PlanoPago[]).map((p) => {
        const plano = PLANOS[p];
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
                  <Check className="h-4 w-4 text-success" /> Todas as abas liberadas
                </li>
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
            <Button
              className="mt-3 gap-2"
              variant={destaque ? "default" : "outline"}
              disabled={abrindo !== null}
              onClick={() => assinar(p)}
            >
              {abrindo === p ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {abrindo === p ? "Abrindo pagamento…" : `Assinar ${plano.nome.toLowerCase()}`}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
