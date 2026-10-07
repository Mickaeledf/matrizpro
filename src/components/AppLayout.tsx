import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { GitBranch, Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false);

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
        <GitBranch className="h-5 w-5" />
        <span className="text-lg font-bold">MatrizPro</span>
      </header>
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="w-60 border-0 p-0 [&>button]:text-sidebar-custom-fg [&>button]:ring-offset-transparent [&>button[data-state=open]]:bg-transparent">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <AppSidebar onNavigate={() => setMenuAberto(false)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 print:overflow-visible print:bg-white print:p-0">
        <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">Carregando…</p>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
