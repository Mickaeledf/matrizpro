import { FormEvent, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Loader2, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NEGOCIO, PLANOS, PlanoPago, moeda } from "@/config/negocio";
import { useAssinatura } from "@/lib/assinatura";
import {
  ROTULO_STATUS_PAGAMENTO,
  confirmarPagamento,
  cpfValido,
  formatarCelular,
  formatarCpf,
  gerarPix,
  soDigitos,
} from "@/lib/pagamentos";

/** PIX já gerado (para abrir de novo a partir de "Meus pagamentos"). */
export interface PixGerado {
  pedido: string;
  pix: string;
  valor: number;
  plano: PlanoPago;
}

type Etapa = { tipo: "dados" } | { tipo: "pix"; pix: PixGerado } | { tipo: "pago"; plano: PlanoPago };

const INTERVALO_CONFERENCIA = 5000;
const LIMITE_CONFERENCIA = 30 * 60 * 1000;

/**
 * Pagamento por PIX (SyncPay): pede nome, CPF e celular (exigidos pela SyncPay),
 * mostra o QR Code / copia e cola e confere sozinho até o pagamento cair.
 */
export function PagamentoPixDialog({
  plano,
  pixExistente,
  onFechar,
}: {
  plano: PlanoPago | null;
  pixExistente?: PixGerado | null;
  onFechar: () => void;
}) {
  const aberto = !!plano || !!pixExistente;
  const recarregarAssinatura = useAssinatura((s) => s.carregar);
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "dados" });
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [celular, setCelular] = useState("");
  const [erros, setErros] = useState<{ nome?: string; cpf?: string; celular?: string; geral?: string }>({});
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Ao abrir: começa pelos dados, ou direto no PIX já gerado
  useEffect(() => {
    if (!aberto) return;
    setEtapa(pixExistente ? { tipo: "pix", pix: pixExistente } : { tipo: "dados" });
    setErros({});
    setAviso(null);
  }, [aberto, pixExistente]);

  // Com o PIX na tela, confere o pagamento a cada 5 segundos
  const pedidoAtual = etapa.tipo === "pix" ? etapa.pix.pedido : null;
  const planoAtual = etapa.tipo === "pix" ? etapa.pix.plano : null;
  useEffect(() => {
    if (!pedidoAtual || !planoAtual) return;
    let ativo = true;
    const inicio = Date.now();
    const conferir = async () => {
      if (!ativo || Date.now() - inicio > LIMITE_CONFERENCIA) return;
      const r = await confirmarPagamento(pedidoAtual);
      if (!ativo) return;
      const status = r.dados?.status;
      if (status === "aprovado") {
        await recarregarAssinatura();
        setEtapa({ tipo: "pago", plano: planoAtual });
        toast.success("Pagamento confirmado! Todas as abas foram liberadas.");
        return;
      }
      if (status === "recusado" || status === "cancelado" || status === "estornado") {
        setAviso(`Pagamento ${ROTULO_STATUS_PAGAMENTO[status].toLowerCase()}. Gere um novo PIX para tentar de novo.`);
        return;
      }
      setTimeout(conferir, INTERVALO_CONFERENCIA);
    };
    const t = setTimeout(conferir, INTERVALO_CONFERENCIA);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [pedidoAtual, planoAtual, recarregarAssinatura]);

  const gerar = async (e: FormEvent) => {
    e.preventDefault();
    if (!plano) return;
    const novos: typeof erros = {};
    if (nome.trim().split(/\s+/).length < 2) novos.nome = "Informe nome e sobrenome.";
    if (!cpfValido(cpf)) novos.cpf = "CPF inválido.";
    if (!/^\d{10,11}$/.test(soDigitos(celular))) novos.celular = "Informe DDD + número.";
    setErros(novos);
    if (Object.keys(novos).length) return;

    setGerando(true);
    const r = await gerarPix(plano, { nome, cpf, celular });
    setGerando(false);
    if (r.dados === null) {
      setErros({ geral: r.erro });
      // Reserva: pagamento online ainda não ativado, mas existe link avulso
      const reserva = NEGOCIO.linksPagamento[plano];
      if (r.naoConfigurado && reserva) window.open(reserva, "_blank", "noreferrer");
      return;
    }
    setEtapa({ tipo: "pix", pix: { pedido: r.dados.pedido, pix: r.dados.pix, valor: r.dados.valor, plano } });
  };

  const copiar = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success("Código PIX copiado. Cole no app do seu banco, em PIX → Copia e Cola.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  const planoInfo = plano ? PLANOS[plano] : pixExistente ? PLANOS[pixExistente.plano] : null;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        {etapa.tipo === "dados" && planoInfo && (
          <>
            <DialogHeader>
              <DialogTitle>Assinar plano {planoInfo.nome.toLowerCase()}</DialogTitle>
              <DialogDescription>
                {moeda(planoInfo.valor)} por PIX. Os dados abaixo são exigidos pelo banco para gerar a cobrança.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={gerar} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pix-nome">Nome completo</Label>
                <Input id="pix-nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
                {erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pix-cpf">CPF</Label>
                  <Input
                    id="pix-cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  />
                  {erros.cpf && <p className="text-xs text-destructive">{erros.cpf}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pix-celular">Celular</Label>
                  <Input
                    id="pix-celular"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(00) 00000-0000"
                    value={celular}
                    onChange={(e) => setCelular(formatarCelular(e.target.value))}
                  />
                  {erros.celular && <p className="text-xs text-destructive">{erros.celular}</p>}
                </div>
              </div>
              {erros.geral && <p className="text-sm text-destructive">{erros.geral}</p>}
              <Button type="submit" className="w-full gap-2" disabled={gerando}>
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {gerando ? "Gerando PIX…" : "Gerar PIX"}
              </Button>
            </form>
          </>
        )}

        {etapa.tipo === "pix" && (
          <>
            <DialogHeader>
              <DialogTitle>Pague com PIX</DialogTitle>
              <DialogDescription>
                Plano {PLANOS[etapa.pix.plano].nome.toLowerCase()} · {moeda(etapa.pix.valor)}. Abra o app do seu banco e leia o QR
                Code ou use o PIX Copia e Cola.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center rounded-lg bg-white p-4">
              <QRCodeSVG value={etapa.pix.pix} size={208} marginSize={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-codigo">PIX Copia e Cola</Label>
              <textarea
                id="pix-codigo"
                readOnly
                value={etapa.pix.pix}
                onFocus={(e) => e.currentTarget.select()}
                className="h-20 w-full resize-none rounded-md border border-input bg-muted/40 p-2 font-mono text-xs text-foreground"
              />
              <Button type="button" className="w-full gap-2" onClick={() => copiar(etapa.pix.pix)}>
                <Copy className="h-4 w-4" /> Copiar código
              </Button>
            </div>
            {aviso ? (
              <p className="text-sm text-destructive">{aviso}</p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                Aguardando o pagamento… a liberação é automática assim que o PIX cair.
              </p>
            )}
          </>
        )}

        {etapa.tipo === "pago" && (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-3 text-lg font-bold text-foreground">Pagamento confirmado!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plano {PLANOS[etapa.plano].nome.toLowerCase()} ativo. Todas as abas foram liberadas.
            </p>
            <Button className="mt-5 w-full" onClick={onFechar}>
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
