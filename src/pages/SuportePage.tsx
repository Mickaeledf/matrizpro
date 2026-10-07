import { BookOpen, CreditCard, Download, LifeBuoy, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAssinatura } from "@/lib/assinatura";
import { NEGOCIO, linkWhatsapp, valorMensalidadeTexto } from "@/config/negocio";
import manual from "@/content/manual.json";

const fmt = (d: Date) => d.toLocaleDateString("pt-BR");

export default function SuportePage() {
  const situacao = useAssinatura((s) => s.situacao);
  const whatsapp = linkWhatsapp();

  const textoAssinatura = (() => {
    switch (situacao.tipo) {
      case "vitalicio":
        return "Acesso ilimitado (conta da proprietária).";
      case "teste":
        return `Teste grátis até ${fmt(situacao.ate)} — faltam ${situacao.diasRestantes} dia(s).`;
      case "mensal":
        return `Plano mensal ativo até ${fmt(situacao.ate)}.`;
      case "expirada":
        return situacao.motivo === "teste" ? "Seu teste grátis terminou." : "Sua mensalidade venceu.";
      case "bloqueada":
        return "Acesso suspenso. Fale com o suporte.";
      default:
        return "Verificando…";
    }
  })();

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Suporte</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-border">
          <CardContent className="flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-success" />
              <h2 className="font-bold text-foreground">Fale com a gente</h2>
            </div>
            <p className="mb-4 flex-1 text-sm text-muted-foreground">
              Dúvidas, sugestões ou problemas? Chame o suporte pelo WhatsApp.
            </p>
            {whatsapp ? (
              <Button asChild className="gap-2 bg-success text-success-foreground hover:bg-success/90">
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                </a>
              </Button>
            ) : (
              <Button disabled className="gap-2">
                <MessageCircle className="h-4 w-4" /> Número em breve
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground">Manual de uso</h2>
            </div>
            <p className="mb-4 flex-1 text-sm text-muted-foreground">
              Passo a passo de todas as funções do sistema, para baixar e consultar quando quiser.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <a href={NEGOCIO.manualPdf} download="Manual-MatrizPro.pdf">
                <Download className="h-4 w-4" /> Baixar manual (PDF)
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="flex h-full flex-col p-5">
            <div className="mb-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-info" />
              <h2 className="font-bold text-foreground">Sua assinatura</h2>
            </div>
            <p className="text-sm text-foreground">{textoAssinatura}</p>
            {situacao.tipo !== "vitalicio" && (
              <p className="mb-4 mt-1 flex-1 text-sm text-muted-foreground">Plano mensal: {valorMensalidadeTexto()}</p>
            )}
            {situacao.tipo !== "vitalicio" &&
              (NEGOCIO.linkPagamento ? (
                <Button asChild className="gap-2">
                  <a href={NEGOCIO.linkPagamento} target="_blank" rel="noreferrer">
                    <CreditCard className="h-4 w-4" /> Assinar / renovar
                  </a>
                </Button>
              ) : (
                <Button disabled variant="outline" className="gap-2">
                  <CreditCard className="h-4 w-4" /> Pagamento online em breve
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Como usar o MatrizPro</h2>
          </div>
          <Accordion type="multiple" className="w-full">
            {manual.secoes.map((secao) => (
              <AccordionItem key={secao.titulo} value={secao.titulo}>
                <AccordionTrigger className="text-left">{secao.titulo}</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
                    {secao.itens.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-bold text-foreground">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {manual.perguntas.map((p) => (
              <AccordionItem key={p.pergunta} value={p.pergunta}>
                <AccordionTrigger className="text-left">{p.pergunta}</AccordionTrigger>
                <AccordionContent className="text-sm text-foreground/90">{p.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
