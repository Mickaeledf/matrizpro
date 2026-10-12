import type { AuthError } from "@supabase/supabase-js";

/** Formato básico de email: algo@dominio.ext, sem espaços. */
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEmail(email: string): string | null {
  if (!email.trim()) return "Informe o email.";
  if (!REGEX_EMAIL.test(email.trim())) return "Email inválido. Exemplo: nome@dominio.com";
  return null;
}

/** Regras de senha exibidas na tela de cadastro (checklist em tempo real). */
export const REGRAS_SENHA = [
  { id: "tamanho", texto: "Mínimo de 8 caracteres", ok: (s: string) => s.length >= 8 },
  { id: "letra", texto: "Pelo menos uma letra (A-Z)", ok: (s: string) => /[A-Za-z]/.test(s) },
  { id: "numero", texto: "Pelo menos um número", ok: (s: string) => /\d/.test(s) },
] as const;

export function validarSenha(senha: string): string | null {
  if (!senha) return "Informe a senha.";
  const falhas = REGRAS_SENHA.filter((r) => !r.ok(senha)).map((r) => r.texto.toLowerCase());
  if (falhas.length > 0) return `A senha precisa ter: ${falhas.join(", ")}.`;
  return null;
}

/**
 * Converte os erros do Supabase em mensagens claras em português.
 * Usa o `code` do erro (mais estável) e, como reserva, o texto da mensagem.
 */
export function traduzirErroAuth(erro: AuthError | Error | null | undefined): string {
  if (!erro) return "Ocorreu um erro inesperado. Tente novamente.";
  const codigo = "code" in erro ? (erro.code as string | undefined) : undefined;
  const mensagem = erro.message?.toLowerCase() ?? "";

  if (codigo === "email_not_confirmed" || mensagem.includes("email not confirmed")) {
    return "Seu email ainda não foi confirmado. Abra o link que enviamos para sua caixa de entrada (verifique também o spam).";
  }
  if (codigo === "invalid_credentials" || mensagem.includes("invalid login credentials")) {
    // Por segurança o Supabase não informa se o erro foi no email ou na senha.
    return "Email ou senha incorretos.";
  }
  if (codigo === "user_already_exists" || codigo === "email_exists" || mensagem.includes("already registered")) {
    return "Este email já está cadastrado. Faça login ou use outro email.";
  }
  if (codigo === "same_password") {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  if (codigo === "session_not_found" || codigo === "session_expired" || mensagem.includes("auth session missing")) {
    return "O link expirou ou já foi usado. Peça um novo link de redefinição de senha.";
  }
  if (codigo === "weak_password") {
    return "Senha fraca. Use pelo menos 8 caracteres com letras e números.";
  }
  if (codigo === "over_email_send_rate_limit" || codigo === "over_request_rate_limit" || mensagem.includes("rate limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }
  if (codigo === "email_address_invalid") {
    return "Este endereço de email não é aceito. Use outro email.";
  }
  if (codigo === "signup_disabled") {
    return "O cadastro de novos usuários está desativado no projeto Supabase.";
  }
  if (mensagem.includes("failed to fetch") || mensagem.includes("network")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e as credenciais do Supabase.";
  }
  return erro.message || "Ocorreu um erro inesperado. Tente novamente.";
}
