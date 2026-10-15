import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Clock, CreditCard, Loader2, Lock, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAssinatura } from "@/lib/assinatura";
import { ABAS_PLANO_PAGO, NEGOCIO, PLANOS, linkWhatsapp, moeda } from "@/config/negocio";
import { PlanosAssinatura } from "@/components/assinatura/PlanosAssinatura";
import { Pagamento, ROTULO_STATUS_PAGAMENTO, confirmarPagamento, listarPagamentos } from "@/lib/pagamentos";
import { cn } from "@/lib/utils";

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("pt-BR");

const ABAS_BASICAS = ["Painel", "Matrizes", "Lotes", "Mensagens", "Suporte", "Configurações"];

/**
 * Assinatura: situação atual, planos e histórico de pagamentos.
 * Com o teste ou o plano vencido, é a única página disponível.
 */
export default function AssinaturaPage() {
  const situacao = useAssinatura((s) => s.situacao);
  const recarregarAssinatura = useAssinatura((s) => s.carregar);
  const [params, setParams] = useSearchParams();
  const pedidoRetorno = params.get("pedido");
  const [conferindo, setConferindo] = useState(false);
  const [pendente, setPendente] = useState<string | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const whatsapp = linkWhatsapp("Olá! Preciso de ajuda com a assinatura do MatrizPro.");

  const carregarPagamentos = useCallback(() => {
    listarPagamentos(20).then(setPagamentos);
  }, []);

  useEffect(carregarPagamentos, [carregarPagamentos]);

  /** Confere no servidor se o pedido foi pago (o servidor consulta o Mercado Pago). */
  const conferir = useCallback(
    async (pedido: string) => {
      setConferindo(true);
      const r = await confirmarPagamento(pedido);
      setConferindo(false);
      carregarPagamentos();
      if (r.dados === null) {
        toast.error(r.erro);
        return;
      }
      if (r.dados.status === "aprovado") {
        setPendente(null);
        await recarregarAssinatura();
        toast.success("Pagamento confirmado! Todas as abas foram liberadas.");
      } else if (r.dados.status === "pendente") {
        setPendente(pedido);
      } else {
        setPendente(null);
        toast.error(`Pagamento ${ROTULO_STATUS_PAGAMENTO[r.dados.status].toLowerCase()}. Tente de novo ou use outra forma de pagamento.`);
      }
    },
    [carregarPagamentos, recarregarAssinatura]
  );

  // Voltou do Mercado Pago: confere o pedido e limpa o endereço
  useEffect(() => {
    if (!pedidoRetorno) return;
    conferir(pedidoRetorno);
    setParams({}, { replace: true });
  }, [pedidoRetorno, conferir, setParams]);

  const vencida = situacao.tipo === "expirada";
  const bloqueada = situacao.tipo === "bloqueada";

  const titulo = (() => {
    switch (situacao.tipo) {
      case "vitalicio":
        return "Acesso ilimitado";
      case "teste":
        return `Teste grátis — ${situacao.diasRestantes === 1 ? "último dia" : `faltam ${situacao.diasRestantes} dias`}`;
      case "pago":
        return `Plano ${PLANOS[situacao.plano].nome.toLowerCase()} ativo`;
      case "expirada":
        return situacao.motivo === "teste" ? `Seu teste grátis de ${NEGOCIO.diasTeste} dias terminou` : "Sua assinatura venceu";
      case "bloqueada":
        return "Acesso suspenso";
      default:
        return "Verificando…";
    }
  })();

  const descricao = (() => {
    switch (situacao.tipo) {
      case "vitalicio":
        return "Conta da proprietária: todas as abas, sem vencimento.";
      case "teste":
        return `Válido até ${fmt(situacao.ate)}. No teste ficam liberadas as abas básicas. Assine para liberar tudo — o tempo de teste que sobrar não se perde.`;
      case "pago":
        return `Válido até ${fmt(situacao.ate)} (${situacao.diasRestantes} dia(s)). Renovando antes, os dias são somados.`;
      case "expirada":
        return "Para continuar, escolha um plano abaixo. Todos os seus dados continuam guardados e voltam assim que o pagamento for confirmado.";
      case "bloqueada":
        return "Seu acesso foi suspenso. Fale com o suporte para regularizar.";
      default:
        return "";
    }
  })();

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>

      <Card className={cn("border", vencida || bloqueada ? "border-warning" : "border-border")}>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              vencida || bloqueada ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"
            )}
          >
            {vencida || bloqueada ? <Lock className="h-6 w-6" /> : situacao.tipo === "teste" ? <Clock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{titulo}</h2>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </div>
          {(bloqueada || vencida) && whatsapp && (
            <Button asChild variant="outline" className="gap-2">
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> Falar com o suporte
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {(conferindo || pendente) && (
        <Card className="border border-info">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            {conferindo ? <Loader2 className="h-5 w-5 animate-spin text-info" /> : <Clock className="h-5 w-5 text-info" />}
            <p className="flex-1 text-sm text-foreground">
              {conferindo
                ? "Conferindo seu pagamento com o Mercado Pago…"
                : "Pagamento ainda não confirmado. PIX e cartão costumam confirmar em poucos minutos; boleto, em até 2 dias úteis. O acesso é liberado sozinho assim que confirmar."}
            </p>
            {!conferindo && pendente && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => conferir(pendente)}>
                <RefreshCw className="h-4 w-4" /> Verificar agora
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {situacao.tipo !== "vitalicio" && !bloqueada && (
        <Card className="border border-border">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Planos</h2>
              <p className="text-sm text-muted-foreground">
                Pagamento pelo Mercado Pago: PIX, cartão de crédito ou boleto. A liberação é automática, assim que o pagamento é
                confirmado.
              </p>
            </div>
            <PlanosAssinatura />
            <div className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-foreground">Teste grátis ({NEGOCIO.diasTeste} dias)</p>
                <p className="text-muted-foreground">{ABAS_BASICAS.join(", ")}.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Planos pagos — tudo liberado</p>
                <p className="text-muted-foreground">
                  Abas básicas + {ABAS_PLANO_PAGO.map((a) => a.nome).join(", ")}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pagamentos.length > 0 && (
        <Card className="border border-border">
          <CardContent className="p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-foreground">Meus pagamentos</h2>
            <ul className="divide-y divide-border">
              {pagamentos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                  <span className="w-24 text-muted-foreground">{fmt(p.criado_em)}</span>
                  <span className="flex-1 font-medium text-foreground">
                    Plano {PLANOS[p.plano].nome.toLowerCase()} · {moeda(p.valor)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      p.status === "aprovado" && "border-success text-success",
                      p.status === "pendente" && "border-info text-info",
                      (p.status === "recusado" || p.status === "estornado") && "border-destructive text-destructive"
                    )}
                  >
                    {p.status === "aprovado" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {ROTULO_STATUS_PAGAMENTO[p.status]}
                  </Badge>
                  {p.status === "pendente" && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1" disabled={conferindo} onClick={() => conferir(p.id)}>
                      <RefreshCw className="h-3.5 w-3.5" /> Verificar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {situacao.tipo !== "vitalicio" && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5" /> O MatrizPro não vê nem guarda os dados do seu cartão: o pagamento é feito no
          ambiente seguro do Mercado Pago.
        </p>
      )}
    </div>
  );
}
