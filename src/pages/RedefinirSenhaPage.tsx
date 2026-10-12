import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { FormNovaSenha } from "@/components/FormNovaSenha";

/**
 * Tela aberta pelo link "Redefinir senha" enviado por email.
 * O Supabase confirma o link e cria uma sessão temporária; aqui o usuário escolhe a nova senha.
 */
export default function RedefinirSenhaPage() {
  const { session, carregando, definirNovaSenha } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-primary">
          <Logo variante="verde" className="h-12 w-12" />
          <span className="text-2xl font-bold">MatrizPro</span>
        </div>

        <Card className="border border-border">
          <CardContent className="p-6 sm:p-8">
            {carregando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !session ? (
              /* Link inválido, expirado ou já usado */
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">Link inválido ou expirado</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este link de redefinição não vale mais (ele expira e só pode ser usado uma vez). Peça um novo na tela de
                  login, em "Esqueci minha senha".
                </p>
                <Button asChild className="mt-6 w-full">
                  <Link to="/login?modo=recuperar">Pedir novo link</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Crie sua nova senha</h1>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>
                <FormNovaSenha
                  onSalvar={async (senha) => {
                    const erro = await definirNovaSenha(senha);
                    if (!erro) {
                      toast.success("Senha alterada! Você já está conectada.");
                      navigate("/", { replace: true });
                    }
                    return erro;
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
