import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Ban, CalendarPlus, CheckCircle2, Loader2, RefreshCw, Search, Unlock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { calcularSituacao, Plano, SituacaoAssinatura, useAssinatura } from "@/lib/assinatura";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/ConfirmDialog";
import { NEGOCIO, valorMensalidadeTexto } from "@/config/negocio";
import { cn } from "@/lib/utils";

interface Assinante {
  user_id: string;
  email: string;
  cadastrado_em: string;
  ultimo_acesso: string | null;
  email_confirmado: boolean;
  plano: Plano | null;
  teste_ate: string | null;
  pago_ate: string | null;
  admin: boolean;
  ativa: boolean;
  observacoes: string | null;
}

type Acao = "pagamento" | "teste" | "bloquear" | "desbloquear";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

function descreverSituacao(s: SituacaoAssinatura): { texto: string; cor: string } {
  switch (s.tipo) {
    case "vitalicio":
      return { texto: "Vitalício", cor: "bg-primary/10 text-primary" };
    case "teste":
      return { texto: `Teste (${s.diasRestantes} d)`, cor: "bg-info/10 text-info" };
    case "mensal":
      return { texto: `Pago (${s.diasRestantes} d)`, cor: "bg-success/10 text-success" };
    case "bloqueada":
      return { texto: "Bloqueado", cor: "bg-destructive/10 text-destructive" };
    case "expirada":
      return { texto: s.motivo === "teste" ? "Teste vencido" : "Mensalidade vencida", cor: "bg-warning/15 text-warning" };
    default:
      return { texto: "—", cor: "bg-muted text-muted-foreground" };
  }
}

export default function AssinantesPage() {
  const admin = useAssinatura((s) => s.admin);
  const verificando = useAssinatura((s) => s.situacao.tipo === "carregando");
  const { confirmar, dialog } = useConfirm();
  const [lista, setLista] = useState<Assinante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [executando, setExecutando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase.rpc("admin_listar_assinantes");
    setCarregando(false);
    if (error) return toast.error(`Não foi possível carregar: ${error.message}`);
    setLista((data ?? []) as Assinante[]);
  }, []);

  useEffect(() => {
    if (admin) carregar();
  }, [admin, carregar]);

  const linhas = useMemo(
    () =>
      lista
        .filter((a) => a.email?.toLowerCase().includes(busca.trim().toLowerCase()))
        .map((a) => ({
          ...a,
          situacao: calcularSituacao(
            a.plano ? { plano: a.plano, teste_ate: a.teste_ate ?? a.cadastrado_em, pago_ate: a.pago_ate, admin: a.admin } : null
          ),
        })),
    [lista, busca]
  );

  const resumo = useMemo(() => {
    const s = lista.map((a) =>
      calcularSituacao(a.plano ? { plano: a.plano, teste_ate: a.teste_ate ?? "", pago_ate: a.pago_ate, admin: a.admin } : null)
    );
    const pagantes = s.filter((x) => x.tipo === "mensal").length;
    return {
      total: lista.length,
      teste: s.filter((x) => x.tipo === "teste").length,
      pagantes,
      vencidos: s.filter((x) => x.tipo === "expirada").length,
      receita: NEGOCIO.valorMensalidade !== null ? pagantes * NEGOCIO.valorMensalidade : null,
    };
  }, [lista]);

  if (!admin) {
    return verificando ? (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ) : (
      <Navigate to="/" replace />
    );
  }

  const executar = async (alvo: Assinante, acao: Acao, dias = 30) => {
    setExecutando(alvo.user_id + acao);
    const { error } = await supabase.rpc("admin_alterar_assinatura", { alvo: alvo.user_id, acao, dias });
    setExecutando(null);
    if (error) return toast.error(error.message);
    toast.success("Assinatura atualizada.");
    carregar();
  };

  const kpis = [
    { label: "Cadastros", valor: resumo.total },
    { label: "Em teste grátis", valor: resumo.teste },
    { label: "Pagantes", valor: resumo.pagantes },
    { label: "Vencidos", valor: resumo.vencidos },
    {
      label: "Receita mensal estimada",
      valor:
        resumo.receita !== null
          ? resumo.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "Defina o valor",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinantes</h1>
          <p className="text-sm text-muted-foreground">
            Área da administradora. Mensalidade: {valorMensalidadeTexto()} · teste grátis de {NEGOCIO.diasTeste} dias.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={carregar} disabled={carregando}>
          <RefreshCw className={cn("h-4 w-4", carregando && "animate-spin")} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="relative mb-4 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por email" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          {carregando && lista.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Teste até</TableHead>
                  <TableHead>Pago até</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((a) => {
                  const d = descreverSituacao(a.situacao);
                  const ocupado = (acao: Acao) => executando === a.user_id + acao;
                  return (
                    <TableRow key={a.user_id}>
                      <TableCell className="font-medium">
                        {a.email}
                        {!a.email_confirmado && (
                          <span className="block text-xs text-muted-foreground">email não confirmado</span>
                        )}
                      </TableCell>
                      <TableCell>{fmt(a.cadastrado_em)}</TableCell>
                      <TableCell>{fmt(a.ultimo_acesso)}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", d.cor)}>
                          {d.texto}
                        </span>
                      </TableCell>
                      <TableCell>{a.plano === "vitalicio" ? "—" : fmt(a.teste_ate)}</TableCell>
                      <TableCell>{fmt(a.pago_ate)}</TableCell>
                      <TableCell className="text-right">
                        {a.admin ? (
                          <span className="text-xs text-muted-foreground">Administradora</span>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={!!executando}
                              onClick={() =>
                                confirmar({
                                  titulo: `Registrar pagamento de ${a.email}?`,
                                  descricao: "Libera 30 dias de acesso (somados ao período já pago, se houver).",
                                  confirmar: "Registrar pagamento",
                                  onConfirm: () => executar(a, "pagamento", 30),
                                })
                              }
                            >
                              {ocupado("pagamento") ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              +30 dias pagos
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              disabled={!!executando}
                              onClick={() => executar(a, "teste", 10)}
                              title="Estender o teste grátis em 10 dias"
                            >
                              <CalendarPlus className="h-4 w-4" /> +10 teste
                            </Button>
                            {a.plano === "bloqueado" ? (
                              <Button size="sm" variant="ghost" className="gap-1" disabled={!!executando} onClick={() => executar(a, "desbloquear")}>
                                <Unlock className="h-4 w-4" /> Desbloquear
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-destructive hover:text-destructive"
                                disabled={!!executando}
                                onClick={() =>
                                  confirmar({
                                    titulo: `Bloquear ${a.email}?`,
                                    descricao: "A pessoa não poderá mais gravar dados até ser desbloqueada. Os dados dela continuam guardados.",
                                    confirmar: "Bloquear",
                                    onConfirm: () => executar(a, "bloquear"),
                                  })
                                }
                              >
                                <Ban className="h-4 w-4" /> Bloquear
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {linhas.length === 0 && !carregando && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum assinante encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
