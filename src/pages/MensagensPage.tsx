import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Inbox, Loader2, Mail, MailOpen, Send, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth";
import { useAssinatura } from "@/lib/assinatura";
import { Mensagem, useMensagens } from "@/lib/mensagens";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Campo } from "@/components/Campo";
import { useConfirm } from "@/components/ConfirmDialog";
import { PlanosAssinatura } from "@/components/assinatura/PlanosAssinatura";
import { cn } from "@/lib/utils";

const TODOS = "__todos__";
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Uma mensagem na caixa de entrada: clique para abrir (e marcar como lida). */
function ItemMensagem({ m, aberta, onAbrir }: { m: Mensagem; aberta: boolean; onAbrir: () => void }) {
  return (
    <div className={cn("rounded-lg border", m.lida ? "border-border" : "border-primary/40 bg-primary/5")}>
      <button
        type="button"
        onClick={onAbrir}
        aria-expanded={aberta}
        className="flex w-full items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {m.lida ? (
          <MailOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm", m.lida ? "text-foreground" : "font-semibold text-foreground")}>{m.titulo}</p>
          <p className="text-xs text-muted-foreground">
            {m.sistema ? "MatrizPro (automática)" : "Equipe MatrizPro"} · {dataHora(m.criado_em)}
          </p>
        </div>
        {!m.lida && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
      </button>
      {aberta && (
        <div className="space-y-4 border-t px-4 pb-4 pt-3">
          <p className="whitespace-pre-line text-sm text-foreground/90">{m.corpo}</p>
          {m.link && (
            <Button asChild variant="outline" className="gap-2">
              <a href={m.link} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> {m.link_rotulo || "Abrir link"}
              </a>
            </Button>
          )}
          {m.mostrarPlanos && <PlanosAssinatura compacto />}
        </div>
      )}
    </div>
  );
}

interface Destinatario {
  user_id: string;
  email: string;
}

export default function MensagensPage() {
  const { user } = useAuth();
  const situacao = useAssinatura((s) => s.situacao);
  const admin = useAssinatura((s) => s.admin);
  const { mensagens, carregando, carregar, marcarLida, enviar, apagar } = useMensagens();
  const { confirmar, dialog } = useConfirm();
  const [searchParams] = useSearchParams();
  const [aberta, setAberta] = useState<string | null>(null);

  // Formulário de envio (somente administradora)
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [form, setForm] = useState({ para: searchParams.get("para") ?? TODOS, titulo: "", corpo: "", link: "", link_rotulo: "" });
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    carregar(situacao);
  }, [carregar, situacao]);

  useEffect(() => {
    if (!admin) return;
    supabase.rpc("admin_listar_assinantes").then(({ data }) => setDestinatarios((data ?? []) as Destinatario[]));
  }, [admin]);

  // Caixa de entrada: mensagens para mim ou para todos (a admin também vê as que enviou a outros, em "Enviadas")
  const entrada = useMemo(() => mensagens.filter((m) => m.para === null || m.para === user?.id), [mensagens, user?.id]);
  const enviadas = useMemo(() => mensagens.filter((m) => !m.sistema), [mensagens]);
  const naoLidas = entrada.filter((m) => !m.lida).length;
  const emailDe = (id: string | null) => (id ? destinatarios.find((d) => d.user_id === id)?.email ?? "usuário" : "Todos");

  const abrir = (m: Mensagem) => {
    setAberta((atual) => (atual === m.id ? null : m.id));
    marcarLida(m.id);
  };

  const enviarMensagem = async () => {
    const novos: Record<string, string> = {};
    if (!form.titulo.trim()) novos.titulo = "Informe o título.";
    if (!form.corpo.trim()) novos.corpo = "Escreva a mensagem.";
    if (form.link.trim() && !/^https?:\/\//i.test(form.link.trim())) novos.link = "O link deve começar com http:// ou https://";
    if (Object.keys(novos).length > 0) return setErros(novos);
    setErros({});
    setEnviando(true);
    const erro = await enviar({
      para: form.para === TODOS ? null : form.para,
      titulo: form.titulo,
      corpo: form.corpo,
      link: form.link,
      link_rotulo: form.link_rotulo,
    });
    setEnviando(false);
    if (erro) return toast.error(`Não foi possível enviar: ${erro}`);
    toast.success(form.para === TODOS ? "Mensagem enviada para todos os usuários." : `Mensagem enviada para ${emailDe(form.para)}.`);
    setForm({ para: TODOS, titulo: "", corpo: "", link: "", link_rotulo: "" });
    carregar(situacao);
  };

  const caixaEntrada = (
    <Card className="border border-border">
      <CardContent className="space-y-3 p-4 sm:p-6">
        {carregando && entrada.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : entrada.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Inbox className="h-8 w-8" />
            Nenhuma mensagem por enquanto. Avisos da equipe MatrizPro aparecem aqui.
          </div>
        ) : (
          entrada.map((m) => <ItemMensagem key={m.id} m={m} aberta={aberta === m.id} onAbrir={() => abrir(m)} />)
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          {admin
            ? "Envie avisos para todos os usuários ou para uma pessoa. Os usuários só podem ler."
            : "Avisos da equipe MatrizPro. Esta caixa é só para leitura."}
          {naoLidas > 0 && ` · ${naoLidas} não lida(s)`}
        </p>
      </div>

      {!admin ? (
        caixaEntrada
      ) : (
        <Tabs defaultValue={searchParams.get("para") ? "enviar" : "entrada"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="entrada">Caixa de entrada{naoLidas > 0 ? ` (${naoLidas})` : ""}</TabsTrigger>
            <TabsTrigger value="enviar">Enviar mensagem</TabsTrigger>
            <TabsTrigger value="enviadas">Enviadas ({enviadas.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="entrada">{caixaEntrada}</TabsContent>

          <TabsContent value="enviar">
            <Card className="max-w-2xl border border-border">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <Campo label="Para">
                  <Select value={form.para} onValueChange={(v) => setForm({ ...form, para: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TODOS}>Todos os usuários</SelectItem>
                      {destinatarios
                        .filter((d) => d.user_id !== user?.id)
                        .map((d) => (
                          <SelectItem key={d.user_id} value={d.user_id}>
                            {d.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo label="Título" erro={erros.titulo}>
                  <Input maxLength={150} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                </Campo>
                <Campo label="Mensagem" erro={erros.corpo}>
                  <Textarea rows={6} maxLength={5000} value={form.corpo} onChange={(e) => setForm({ ...form, corpo: e.target.value })} />
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo label="Link (opcional)" erro={erros.link} ajuda="Ex.: link de pagamento ou de um vídeo.">
                    <Input placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
                  </Campo>
                  <Campo label="Texto do botão do link">
                    <Input
                      placeholder="Ex.: Pagar agora"
                      value={form.link_rotulo}
                      onChange={(e) => setForm({ ...form, link_rotulo: e.target.value })}
                    />
                  </Campo>
                </div>
                <div className="flex justify-end">
                  <Button className="gap-2" onClick={enviarMensagem} disabled={enviando}>
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enviadas">
            <Card className="border border-border">
              <CardContent className="space-y-3 p-4 sm:p-6">
                {enviadas.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem enviada ainda.</p>
                ) : (
                  enviadas.map((m) => (
                    <div key={m.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{m.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          Para: {emailDe(m.para)} · {dataHora(m.criado_em)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{m.corpo}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Apagar mensagem"
                        onClick={() =>
                          confirmar({
                            titulo: "Apagar esta mensagem?",
                            descricao: "Ela some da caixa de entrada de todos os destinatários.",
                            onConfirm: async () => {
                              const erro = await apagar(m.id);
                              if (erro) toast.error(erro);
                              else toast.success("Mensagem apagada.");
                            },
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      {dialog}
    </div>
  );
}
