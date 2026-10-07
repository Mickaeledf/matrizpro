import { Link, useLocation } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <GitBranch className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="mb-2 text-4xl font-bold text-foreground">Página não encontrada</h1>
        <p className="mb-6 text-muted-foreground">
          O endereço <code className="rounded bg-muted px-1">{location.pathname}</code> não existe no MatrizPro.
        </p>
        <Button asChild>
          <Link to="/">Voltar ao Painel</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
