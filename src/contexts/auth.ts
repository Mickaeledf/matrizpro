import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthContextValue {
  /** Sessão atual (null quando deslogado). */
  session: Session | null;
  user: User | null;
  /** true enquanto verifica se já existe sessão salva ao abrir a página. */
  carregando: boolean;
  /** Retorna uma mensagem de erro amigável, ou null em caso de sucesso. */
  entrar: (email: string, senha: string, captcha?: string | null) => Promise<string | null>;
  /** Retorna erro, ou indica se é preciso confirmar o email. */
  /** Cria a conta; registra no cadastro a versão dos Termos/Privacidade aceita. */
  cadastrar: (email: string, senha: string, captcha?: string | null) => Promise<{ erro: string | null; precisaConfirmar: boolean }>;
  reenviarConfirmacao: (email: string, captcha?: string | null) => Promise<string | null>;
  /** Envia o email com o link para criar uma nova senha ("Esqueci minha senha"). */
  enviarLinkRedefinicao: (email: string, captcha?: string | null) => Promise<string | null>;
  /** Grava a nova senha do usuário logado (ou que chegou pelo link de redefinição). */
  definirNovaSenha: (senha: string) => Promise<string | null>;
  /** true quando o usuário chegou pelo link de redefinição de senha do email. */
  emRecuperacao: boolean;
  sair: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
