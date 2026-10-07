import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";

/** Só renderiza o conteúdo se houver usuário logado; senão, manda para /login. */
export function RotaProtegida({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Verificando sessão" />
      </div>
    );
  }

  if (!session) {
    // Guarda a página pedida para voltar a ela depois do login
    return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
