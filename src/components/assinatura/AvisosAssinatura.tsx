import { Link } from "react-router-dom";
import { Clock, CreditCard, LifeBuoy, Lock, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SituacaoAssinatura } from "@/lib/assinatura";
import { NEGOCIO, linkWhatsapp, valorMensalidadeTexto } from "@/config/negocio";
import { cn } from "@/lib/utils";

/** Faixa no topo durante o teste grátis (ou perto do vencimento da mensalidade). */
export function FaixaAssinatura({ situacao }: { situacao: SituacaoAssinatura }) {
  const mostrar =
    situacao.tipo === "teste" || (situacao.tipo === "mensal" && situacao.diasRestantes <= 5);
  if (!mostrar) return null;

  const urgente = situacao.diasRestantes <= 3;
  const texto =
    situacao.tipo === "teste"
      ? `Teste grátis: ${situacao.diasRestantes === 1 ? "último dia" : `faltam ${situacao.diasRestantes} dias`}.`
      : `Sua mensalidade vence em ${situacao.diasRestantes} dia(s).`;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm print:hidden",
        urgente ? "bg-warning/15 text-foreground" : "bg-info/10 text-foreground"
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{texto}</span>
      <Link to="/suporte" className="font-medium text-primary underline-offset-2 hover:underline">
        Ver como assinar
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
      <Card className="w-full max-w-lg border border-border">
        <CardContent className="p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
            <Lock className="h-7 w-7 text-warning" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {bloqueada
              ? "Acesso suspenso"
              : situacao.tipo === "expirada" && situacao.motivo === "mensalidade"
                ? "Sua mensalidade venceu"
                : `Seu teste grátis de ${NEGOCIO.diasTeste} dias terminou`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {bloqueada
              ? "Seu acesso foi suspenso. Fale com o suporte para regularizar."
              : "Para continuar usando o MatrizPro, assine o plano mensal. Todos os seus dados continuam guardados e voltam assim que o acesso for liberado."}
          </p>

          {!bloqueada && (
            <div className="mt-6 rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Plano mensal</p>
              <p className="text-2xl font-bold text-foreground">{valorMensalidadeTexto()}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {!bloqueada &&
              (NEGOCIO.linkPagamento ? (
                <Button asChild className="gap-2">
                  <a href={NEGOCIO.linkPagamento} target="_blank" rel="noreferrer">
                    <CreditCard className="h-4 w-4" /> Assinar agora
                  </a>
                </Button>
              ) : (
                <Button disabled className="gap-2">
                  <CreditCard className="h-4 w-4" /> Pagamento online em breve
                </Button>
              ))}
            {whatsapp ? (
              <Button asChild variant="outline" className="gap-2">
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Falar com o suporte no WhatsApp
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline" className="gap-2">
                <Link to="/suporte">
                  <LifeBuoy className="h-4 w-4" /> Ir para o Suporte
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
