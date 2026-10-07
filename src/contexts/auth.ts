import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextValue {
  /** Sessão atual (null quando deslogado). */
  session: Session | null;
  user: User | null;
  /** true enquanto verifica se já existe sessão salva ao abrir a página. */
  carregando: boolean;
  /** Retorna uma mensagem de erro amigável, ou null em caso de sucesso. */
  entrar: (email: string, senha: string) => Promise<string | null>;
  /** Retorna erro, ou indica se é preciso confirmar o email. */
  cadastrar: (email: string, senha: string) => Promise<{ erro: string | null; precisaConfirmar: boolean }>;
  reenviarConfirmacao: (email: string) => Promise<string | null>;
  sair: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
