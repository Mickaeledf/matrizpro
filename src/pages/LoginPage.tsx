import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff, Loader2, MailCheck, X } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { supabaseConfigurado } from "@/lib/supabase";
import { REGRAS_SENHA, validarEmail, validarSenha } from "@/lib/authValidacao";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

type Modo = "entrar" | "cadastrar";
type Erros = Partial<Record<"email" | "senha" | "confirmacao", string>>;

/** Campo de senha com botão de mostrar/ocultar. */
function CampoSenha({
  id,
  label,
  valor,
  onChange,
  erro,
  autoComplete,
}: {
  id: string;
  label: string;
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  autoComplete: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? "text" : "password"}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!erro}
          className={cn("pr-10", erro && "border-destructive")}
        />
        <button
          type="button"
          onClick={() => setVisivel(!visivel)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        >
          {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  );
}

export default function LoginPage() {
  const { session, carregando, entrar, cadastrar, reenviarConfirmacao } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { de?: string } | null)?.de || "/";

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Email para o qual enviamos a confirmação (mostra a tela "verifique seu email")
  const [emailPendente, setEmailPendente] = useState<string | null>(null);
  const [podeReenviar, setPodeReenviar] = useState(false);
  const [avisoReenvio, setAvisoReenvio] = useState<string | null>(null);

  // Já logado (ex.: sessão salva ou voltou pelo link de confirmação): vai direto para o app
  if (!carregando && session) return <Navigate to={destino} replace />;

  const trocarModo = (novo: Modo) => {
    setModo(novo);
    setErros({});
    setErroGeral(null);
    setSenha("");
    setConfirmacao("");
    setPodeReenviar(false);
    setAvisoReenvio(null);
  };

  /** Valida os campos antes de chamar o Supabase. */
  const validarFormulario = (): boolean => {
    const novos: Erros = {};
    const erroEmail = validarEmail(email);
    if (erroEmail) novos.email = erroEmail;

    if (modo === "entrar") {
      if (!senha) novos.senha = "Informe a senha.";
    } else {
      const erroSenha = validarSenha(senha);
      if (erroSenha) novos.senha = erroSenha;
      if (!confirmacao) novos.confirmacao = "Confirme a senha.";
      else if (confirmacao !== senha) novos.confirmacao = "As senhas não coincidem.";
    }

    setErros(novos);
    return Object.keys(novos).length === 0;
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErroGeral(null);
    setAvisoReenvio(null);
    setPodeReenviar(false);
    if (!validarFormulario()) return;

    setEnviando(true);
    try {
      if (modo === "entrar") {
        const erro = await entrar(email, senha);
        if (erro) {
          setErroGeral(erro);
          // Se o email não foi confirmado, oferece reenviar o link
          setPodeReenviar(erro.startsWith("Seu email ainda não foi confirmado"));
        } else {
          navigate(destino, { replace: true });
        }
      } else {
        const { erro, precisaConfirmar } = await cadastrar(email, senha);
        if (erro) setErroGeral(erro);
        else if (precisaConfirmar) setEmailPendente(email.trim());
      }
    } catch (err) {
      setErroGeral(err instanceof Error ? err.message : "Ocorreu um erro inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async (alvo: string) => {
    setEnviando(true);
    const erro = await reenviarConfirmacao(alvo);
    setEnviando(false);
    setAvisoReenvio(erro ?? "Enviamos um novo link de confirmação. Verifique sua caixa de entrada e o spam.");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Painel lateral com a marca (só em telas grandes) */}
      <aside className="sidebar-gradient hidden w-[42%] flex-col justify-between p-10 text-sidebar-custom-fg lg:flex">
        <div className="flex items-center gap-2">
          <Logo className="h-14 w-14" />
          <span className="text-2xl font-bold tracking-tight">MatrizPro</span>
        </div>
        <div>
          <Logo className="mb-8 h-48 w-48 opacity-90" />
          <h2 className="text-3xl font-bold leading-tight">Gestão de matrizes e leitões, do parto à venda.</h2>
          <p className="mt-4 text-sidebar-custom-fg/80">
            Ciclo reprodutivo, pesagens, saúde, vacinas e custos em um só lugar, com alertas automáticos.
          </p>
        </div>
        <p className="text-sm text-sidebar-custom-fg/60">© {new Date().getFullYear()} MatrizPro</p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2 text-primary lg:hidden">
            <Logo variante="verde" className="h-12 w-12" />
            <span className="text-2xl font-bold">MatrizPro</span>
          </div>

          {!supabaseConfigurado && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Supabase não configurado</AlertTitle>
              <AlertDescription>
                Cole a Project URL e a anon key no topo do arquivo <code>src/lib/supabase.ts</code>.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border border-border">
            <CardContent className="p-6 sm:p-8">
              {emailPendente ? (
                /* ---------- Tela pós-cadastro: confirmar email ---------- */
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                    <MailCheck className="h-7 w-7 text-success" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">Confirme seu email</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enviamos um link de confirmação para <strong className="text-foreground">{emailPendente}</strong>.
                    Abra o email e clique no link para ativar sua conta. Depois disso você já pode entrar.
                  </p>
                  {avisoReenvio && <p className="mt-4 text-sm text-foreground">{avisoReenvio}</p>}
                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        setEmailPendente(null);
                        trocarModo("entrar");
                      }}
                    >
                      Ir para o login
                    </Button>
                    <Button variant="ghost" disabled={enviando} onClick={() => reenviar(emailPendente)}>
                      {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Não recebeu? Reenviar email
                    </Button>
                  </div>
                </div>
              ) : (
                /* ---------- Formulário de login / cadastro ---------- */
                <>
                  <Tabs value={modo} onValueChange={(v) => trocarModo(v as Modo)} className="mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="entrar">Entrar</TabsTrigger>
                      <TabsTrigger value="cadastrar">Criar conta</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <h1 className="text-xl font-bold text-foreground">
                    {modo === "entrar" ? "Bem-vindo de volta" : "Crie sua conta"}
                  </h1>
                  <p className="mb-6 mt-1 text-sm text-muted-foreground">
                    {modo === "entrar"
                      ? "Entre com seu email e senha cadastrados."
                      : "Você receberá um email para confirmar o cadastro."}
                  </p>

                  {erroGeral && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {erroGeral}
                        {podeReenviar && (
                          <button
                            type="button"
                            className="mt-2 block font-medium underline underline-offset-2"
                            disabled={enviando}
                            onClick={() => reenviar(email)}
                          >
                            Reenviar email de confirmação
                          </button>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                  {avisoReenvio && <p className="mb-4 text-sm text-foreground">{avisoReenvio}</p>}

                  <form onSubmit={enviar} noValidate className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="nome@dominio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!erros.email}
                        className={cn(erros.email && "border-destructive")}
                      />
                      {erros.email && <p className="text-xs text-destructive">{erros.email}</p>}
                    </div>

                    <CampoSenha
                      id="senha"
                      label="Senha"
                      valor={senha}
                      onChange={setSenha}
                      erro={erros.senha}
                      autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                    />

                    {modo === "cadastrar" && (
                      <>
                        {/* Checklist das regras de senha, atualizado enquanto digita */}
                        <ul className="space-y-1 text-xs">
                          {REGRAS_SENHA.map((regra) => {
                            const ok = regra.ok(senha);
                            return (
                              <li
                                key={regra.id}
                                className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}
                              >
                                {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                {regra.texto}
                              </li>
                            );
                          })}
                        </ul>
                        <CampoSenha
                          id="confirmacao"
                          label="Confirmar senha"
                          valor={confirmacao}
                          onChange={setConfirmacao}
                          erro={erros.confirmacao}
                          autoComplete="new-password"
                        />
                      </>
                    )}

                    <Button type="submit" className="w-full" disabled={enviando || !supabaseConfigurado}>
                      {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {enviando
                        ? modo === "entrar"
                          ? "Entrando..."
                          : "Criando conta..."
                        : modo === "entrar"
                          ? "Entrar"
                          : "Criar conta"}
                    </Button>
                  </form>

                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    {modo === "entrar" ? "Ainda não tem conta? " : "Já tem conta? "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => trocarModo(modo === "entrar" ? "cadastrar" : "entrar")}
                    >
                      {modo === "entrar" ? "Criar conta" : "Entrar"}
                    </button>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
