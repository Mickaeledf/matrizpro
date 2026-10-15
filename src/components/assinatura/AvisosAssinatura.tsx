import { Link } from "react-router-dom";
import { Clock, CreditCard, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SituacaoAssinatura } from "@/lib/assinatura";
import { ABAS_PLANO_PAGO, NEGOCIO, PLANOS } from "@/config/negocio";
import { cn } from "@/lib/utils";

/**
 * Faixa no topo:
 * - durante o teste grátis: até o teste acabar;
 * - assinantes pagos: a partir de NEGOCIO.diasAvisoRenovacao dias antes do vencimento.
 */
export function FaixaAssinatura({ situacao }: { situacao: SituacaoAssinatura }) {
  const mostrar =
    situacao.tipo === "teste" || (situacao.tipo === "pago" && situacao.diasRestantes <= NEGOCIO.diasAvisoRenovacao);
  if (!mostrar) return null;

  const urgente = situacao.diasRestantes <= 3;
  const texto =
    situacao.tipo === "teste"
      ? `Teste grátis (abas básicas): ${situacao.diasRestantes === 1 ? "último dia" : `faltam ${situacao.diasRestantes} dias`}.`
      : `Seu plano ${PLANOS[situacao.plano].nome.toLowerCase()} vence em ${situacao.diasRestantes} dia(s).`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm print:hidden",
        urgente ? "bg-warning/15 text-foreground" : "bg-info/10 text-foreground"
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{texto}</span>
      <Link to="/assinatura" className="font-medium text-primary underline-offset-2 hover:underline">
        {situacao.tipo === "teste" ? "Assinar e liberar tudo" : "Renovar"}
      </Link>
    </div>
  );
}

/** Mostrada no teste grátis quando a pessoa abre uma aba dos planos pagos. */
export function TelaRecursoDoPlano({ rota }: { rota: string }) {
  const aba = ABAS_PLANO_PAGO.find((a) => a.rota === rota);

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-8">
      <Card className="w-full max-w-lg border border-border">
        <CardContent className="p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{aba?.nome ?? "Esta aba"} faz parte dos planos pagos</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {aba && <>Aqui você tem {aba.descricao}. </>}
            No teste grátis ficam liberadas as abas básicas. Assine o plano mensal ou semestral para liberar tudo.
          </p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/assinatura">
              <CreditCard className="h-4 w-4" /> Ver planos
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
