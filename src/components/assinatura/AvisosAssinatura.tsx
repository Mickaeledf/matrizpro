import { Link } from "react-router-dom";
import { Clock, LifeBuoy, Lock, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SituacaoAssinatura } from "@/lib/assinatura";
import { NEGOCIO, PLANOS, linkWhatsapp } from "@/config/negocio";
import { PlanosAssinatura } from "./PlanosAssinatura";
import { cn } from "@/lib/utils";

/**
 * Faixa no topo:
 * - durante o teste grátis: até o teste acabar;
 * - assinantes pagos: a partir de 10 dias antes do vencimento.
 */
export function FaixaAssinatura({ situacao }: { situacao: SituacaoAssinatura }) {
  const mostrar =
    situacao.tipo === "teste" || (situacao.tipo === "pago" && situacao.diasRestantes <= NEGOCIO.diasAvisoRenovacao);
  if (!mostrar) return null;

  const urgente = situacao.diasRestantes <= 3;
  const texto =
    situacao.tipo === "teste"
      ? `Teste grátis: ${situacao.diasRestantes === 1 ? "último dia" : `faltam ${situacao.diasRestantes} dias`}.`
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
      <Link to={situacao.tipo === "teste" ? "/suporte" : "/mensagens"} className="font-medium text-primary underline-offset-2 hover:underline">
        {situacao.tipo === "teste" ? "Ver planos" : "Renovar"}
      </Link>
    </div>
  );
}

/** Tela exibida quando o teste ou a mensalidade venceu (os dados continuam guardados). */
export function TelaAssinaturaBloqueada({ situacao }: { situacao: SituacaoAssinatura }) {
  const bloqueada = situacao.tipo === "bloqueada";
  const whatsapp = linkWhatsapp("Olá! Quero assinar/renovar o MatrizPro.");

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <Card className="w-full max-w-2xl border border-border">
        <CardContent className="p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
            <Lock className="h-7 w-7 text-warning" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {bloqueada
              ? "Acesso suspenso"
              : situacao.tipo === "expirada" && situacao.motivo === "mensalidade"
                ? "Sua assinatura venceu"
                : `Seu teste grátis de ${NEGOCIO.diasTeste} dias terminou`}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {bloqueada
              ? "Seu acesso foi suspenso. Fale com o suporte para regularizar."
              : "Escolha um plano para continuar. Todos os seus dados continuam guardados e voltam assim que o pagamento for confirmado."}
          </p>

          {!bloqueada && (
            <div className="mt-6">
              <PlanosAssinatura />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {whatsapp && (
              <Button asChild variant="outline" className="gap-2">
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Falar com o suporte
                </a>
              </Button>
            )}
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/mensagens">Ver minhas mensagens</Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/suporte">
                <LifeBuoy className="h-4 w-4" /> Suporte
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
