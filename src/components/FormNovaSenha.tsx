import { FormEvent, useState } from "react";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGRAS_SENHA, validarSenha } from "@/lib/authValidacao";
import { cn } from "@/lib/utils";

/**
 * Formulário de nova senha + confirmação, com o checklist das regras.
 * Usado na tela "Redefinir senha" (link do email) e em Configurações → Alterar senha.
 */
export function FormNovaSenha({
  onSalvar,
  rotuloBotao = "Salvar nova senha",
}: {
  /** Recebe a senha já validada; devolve uma mensagem de erro ou null. */
  onSalvar: (senha: string) => Promise<string | null>;
  rotuloBotao?: string;
}) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [visivel, setVisivel] = useState(false);
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string; geral?: string }>({});
  const [salvando, setSalvando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const novos: typeof erros = {};
    const erroSenha = validarSenha(senha);
    if (erroSenha) novos.senha = erroSenha;
    if (!confirmacao) novos.confirmacao = "Confirme a nova senha.";
    else if (confirmacao !== senha) novos.confirmacao = "As senhas não coincidem.";
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setSalvando(true);
    const erro = await onSalvar(senha);
    setSalvando(false);
    if (erro) setErros({ geral: erro });
    else {
      setSenha("");
      setConfirmacao("");
    }
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nova-senha">Nova senha</Label>
        <div className="relative">
          <Input
            id="nova-senha"
            type={visivel ? "text" : "password"}
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={!!erros.senha}
            className={cn("pr-10", erros.senha && "border-destructive")}
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
        {erros.senha && <p className="text-xs text-destructive">{erros.senha}</p>}
      </div>

      <ul className="space-y-1 text-xs">
        {REGRAS_SENHA.map((regra) => {
          const ok = regra.ok(senha);
          return (
            <li key={regra.id} className={cn("flex items-center gap-1.5", ok ? "text-success" : "text-muted-foreground")}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {regra.texto}
            </li>
          );
        })}
      </ul>

      <div className="space-y-1.5">
        <Label htmlFor="confirmar-nova-senha">Confirmar nova senha</Label>
        <Input
          id="confirmar-nova-senha"
          type={visivel ? "text" : "password"}
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          aria-invalid={!!erros.confirmacao}
          className={cn(erros.confirmacao && "border-destructive")}
        />
        {erros.confirmacao && <p className="text-xs text-destructive">{erros.confirmacao}</p>}
      </div>

      {erros.geral && <p className="text-sm text-destructive">{erros.geral}</p>}

      <Button type="submit" className="w-full gap-2" disabled={salvando}>
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        {salvando ? "Salvando..." : rotuloBotao}
      </Button>
    </form>
  );
}
