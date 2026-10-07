import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, Layers, BarChart3, FileText, Settings, LogOut, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/contexts/auth";
import { useStatusSincronizacao } from "@/lib/sincronizacao";

const rotuloStatus = {
  carregando: "Carregando…",
  salvando: "Salvando…",
  sincronizado: "Salvo na nuvem",
  erro: "Erro ao sincronizar",
} as const;

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/matrizes", label: "Matrizes", icon: GitBranch },
  { to: "/lotes", label: "Lotes", icon: Layers },
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
          <GitBranch className="h-7 w-7" />
          <span className="text-xl font-bold tracking-tight">MatrizPro</span>
        </div>
        {nomeFazenda && <p className="mt-1 truncate text-xs text-sidebar-custom-fg/70">{nomeFazenda}</p>}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={linkClass(estaAtivo(location.pathname, item.to))}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-custom-hover px-3 py-4">
        <NavLink
          to="/configuracoes"
          onClick={onNavigate}
          className={linkClass(estaAtivo(location.pathname, "/configuracoes"))}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </NavLink>
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
