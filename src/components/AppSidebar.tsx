import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, Layers, BarChart3, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Painel", icon: LayoutDashboard },
  { to: "/matrizes", label: "Matrizes", icon: GitBranch },
  { to: "/lotes", label: "Lotes", icon: Layers },
  { to: "/analise", label: "Análise", icon: BarChart3 },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar-gradient flex h-screen w-60 flex-col text-sidebar-custom-fg">
      <div className="flex items-center gap-2 px-5 py-6">
        <GitBranch className="h-7 w-7" />
        <span className="text-xl font-bold tracking-tight">MatrizPro</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-custom-active text-sidebar-custom-fg"
                  : "text-sidebar-custom-fg/70 hover:bg-sidebar-custom-hover hover:text-sidebar-custom-fg"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-custom-hover px-3 py-4">
        <NavLink
          to="/configuracoes"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-custom-fg/70 hover:bg-sidebar-custom-hover hover:text-sidebar-custom-fg transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </NavLink>
      </div>
    </aside>
  );
}
