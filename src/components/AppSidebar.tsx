import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, Layers, BarChart3, FileText, Settings, LogOut, Cloud, CloudOff, Loader2, Dna, LifeBuoy, Lock, Mail, Users, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/contexts/auth";
import { useStatusSincronizacao } from "@/lib/sincronizacao";
import { acessoLiberado, planoCompleto, useAssinatura } from "@/lib/assinatura";
import { abaDoPlanoPago } from "@/config/negocio";
import { contarNaoLidas, useMensagens } from "@/lib/mensagens";
import { Logo } from "@/components/Logo";

const rotuloStatus = {
  carregando: "Carregando…",
  salvando: "Salvando…",
  sincronizado: "Salvo na nuvem",
  erro: "Erro ao sincronizar",
} as const;

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/matrizes", label: "Matrizes", icon: GitBranch },
  { to: "/reprodutores", label: "Reprodutores", icon: Dna },
  { to: "/lotes", label: "Lotes", icon: Layers },
  { to: "/faturamento", label: "Faturamento", icon: Wallet },
  { to: "/analise", label: "Análise", icon: BarChart3 },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
];

const estaAtivo = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

export function AppSidebar({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const location = useLocation();
  const nomeFazenda = useStore((s) => s.configuracoes.nomeFazenda);
  const { user, sair } = useAuth();
  const { status, erro } = useStatusSincronizacao();
  const IconeStatus = status === "erro" ? CloudOff : status === "sincronizado" ? Cloud : Loader2;
  const admin = useAssinatura((s) => s.admin);
  const situacao = useAssinatura((s) => s.situacao);
  // Teste/plano vencido: o menu mostra só a Assinatura
  const vencido = !acessoLiberado(situacao);
  // Teste grátis: abas dos planos pagos aparecem com cadeado
  const completo = planoCompleto(situacao);
  const naoLidas = useMensagens((s) => contarNaoLidas(s.mensagens, user?.id));

  const linkClass = (ativo: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      ativo
        ? "bg-sidebar-custom-active text-sidebar-custom-fg"
        : "text-sidebar-custom-fg/70 hover:bg-sidebar-custom-hover hover:text-sidebar-custom-fg"
    );

  return (
    <aside className={cn("sidebar-gradient flex h-full w-60 flex-col text-sidebar-custom-fg", className)}>
      <div className="px-5 py-6">
        <div className="flex items-center gap-2">
          <Logo className="h-11 w-11" />
          <span className="text-xl font-bold tracking-tight">MatrizPro</span>
        </div>
        {nomeFazenda && <p className="mt-1 truncate text-xs text-sidebar-custom-fg/70">{nomeFazenda}</p>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {vencido ? (
          <NavLink to="/assinatura" onClick={onNavigate} className={linkClass(true)}>
            <CreditCard className="h-4 w-4" />
            Assinatura
          </NavLink>
        ) : (
          navItems.map((item) => {
            const travada = !completo && !!abaDoPlanoPago(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={linkClass(estaAtivo(location.pathname, item.to))}
                title={travada ? "Disponível nos planos pagos" : undefined}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {travada && <Lock className="ml-auto h-3.5 w-3.5 opacity-70" aria-label="Plano pago" />}
              </NavLink>
            );
          })
        )}
      </nav>

      <div className="space-y-1 border-t border-sidebar-custom-hover px-3 py-4">
        {!vencido && (
          <>
        <NavLink to="/mensagens" onClick={onNavigate} className={linkClass(estaAtivo(location.pathname, "/mensagens"))}>
          <Mail className="h-4 w-4" />
          Mensagens
          {naoLidas > 0 && (
            <span
              className="ml-auto rounded-full bg-warning px-1.5 text-xs font-semibold text-warning-foreground"
              aria-label={`${naoLidas} mensagem(ns) não lida(s)`}
            >
              {naoLidas}
            </span>
          )}
        </NavLink>
        {situacao.tipo !== "vitalicio" && (
          <NavLink to="/assinatura" onClick={onNavigate} className={linkClass(estaAtivo(location.pathname, "/assinatura"))}>
            <CreditCard className="h-4 w-4" />
            Assinatura
          </NavLink>
        )}
        <NavLink to="/suporte" onClick={onNavigate} className={linkClass(estaAtivo(location.pathname, "/suporte"))}>
          <LifeBuoy className="h-4 w-4" />
          Suporte
        </NavLink>
        {admin && (
          <NavLink
            to="/assinantes"
            onClick={onNavigate}
            className={linkClass(estaAtivo(location.pathname, "/assinantes"))}
          >
            <Users className="h-4 w-4" />
            Assinantes
          </NavLink>
        )}
        <NavLink
          to="/configuracoes"
          onClick={onNavigate}
          className={linkClass(estaAtivo(location.pathname, "/configuracoes"))}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </NavLink>
          </>
        )}
        {user?.email && (
          <p className="mt-3 truncate px-3 text-xs text-sidebar-custom-fg/60" title={user.email}>
            {user.email}
          </p>
        )}
        {user && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 px-3 text-xs",
              status === "erro" ? "text-red-300" : "text-sidebar-custom-fg/60"
            )}
            title={erro ?? undefined}
          >
            <IconeStatus className={cn("h-3.5 w-3.5", (status === "salvando" || status === "carregando") && "animate-spin")} />
            {rotuloStatus[status]}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            sair();
          }}
          className={cn(linkClass(false), "mt-1 w-full")}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
