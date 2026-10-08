import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2, Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth";
import { iniciarSincronizacao } from "@/lib/sincronizacao";
import { acessoLiberado, useAssinatura } from "@/lib/assinatura";
import { useMensagens } from "@/lib/mensagens";
import { FaixaAssinatura, TelaAssinaturaBloqueada } from "@/components/assinatura/AvisosAssinatura";

const Carregando = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    {texto}
  </div>
);

export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;
  const [dadosProntos, setDadosProntos] = useState(false);
  const { pathname } = useLocation();
  const situacao = useAssinatura((s) => s.situacao);
  const carregarAssinatura = useAssinatura((s) => s.carregar);

  // Carrega os dados do usuário da nuvem e mantém tudo sincronizado
  useEffect(() => {
    if (!userId) return;
    setDadosProntos(false);
    return iniciarSincronizacao(userId, () => setDadosProntos(true));
  }, [userId]);

  // Situação da assinatura (teste grátis, mensalidade, dona)
  useEffect(() => {
    if (userId) carregarAssinatura();
  }, [userId, carregarAssinatura]);

  // Caixa de mensagens: carrega ao entrar e confere a cada 2 minutos
  const carregarMensagens = useMensagens((s) => s.carregar);
  useEffect(() => {
    if (!userId || situacao.tipo === "carregando") return;
    carregarMensagens(situacao);
    const t = setInterval(() => carregarMensagens(situacao), 120_000);
    return () => clearInterval(t);
  }, [userId, situacao, carregarMensagens]);

  // Com o acesso vencido, só Suporte e Mensagens continuam disponíveis
  const bloqueado = !acessoLiberado(situacao) && pathname !== "/suporte" && pathname !== "/mensagens";

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row print:block print:h-auto print:overflow-visible">
      {/* Sidebar fixa no desktop */}
      <AppSidebar className="hidden md:flex print:hidden" />

      {/* Barra superior + menu lateral no celular */}
      <header className="sidebar-gradient flex items-center gap-3 px-4 py-3 text-sidebar-custom-fg md:hidden print:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-custom-fg hover:bg-sidebar-custom-hover hover:text-sidebar-custom-fg"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Logo className="h-7 w-7" />
        <span className="text-lg font-bold">MatrizPro</span>
      </header>
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="w-60 border-0 p-0 [&>button]:text-sidebar-custom-fg [&>button]:ring-offset-transparent [&>button[data-state=open]]:bg-transparent">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <AppSidebar onNavigate={() => setMenuAberto(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 flex-1 flex-col print:block">
        <FaixaAssinatura situacao={situacao} />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 print:overflow-visible print:bg-white print:p-0">
          {bloqueado ? (
            <TelaAssinaturaBloqueada situacao={situacao} />
          ) : dadosProntos ? (
            <Suspense fallback={<Carregando texto="Carregando…" />}>
              <Outlet />
            </Suspense>
          ) : (
            <Carregando texto="Carregando seus dados…" />
          )}
        </main>
      </div>
    </div>
  );
}
