import { describe, it, expect } from "vitest";
import { AuthError } from "@supabase/supabase-js";
import { traduzirErroAuth, validarEmail, validarSenha } from "@/lib/authValidacao";

describe("validarEmail", () => {
  it("aceita emails válidos", () => {
    expect(validarEmail("maria@fazenda.com.br")).toBeNull();
    expect(validarEmail("  joao.silva@gmail.com ")).toBeNull();
  });

  it("rejeita vazio e formatos inválidos", () => {
    expect(validarEmail("")).toBe("Informe o email.");
    expect(validarEmail("maria")).toMatch(/inválido/);
    expect(validarEmail("maria@fazenda")).toMatch(/inválido/);
    expect(validarEmail("maria @fazenda.com")).toMatch(/inválido/);
  });
});

describe("validarSenha", () => {
  it("aceita senha com 8+ caracteres, letra e número", () => {
    expect(validarSenha("porco2026")).toBeNull();
  });

  it("explica cada regra que falhou", () => {
    expect(validarSenha("")).toBe("Informe a senha.");
    expect(validarSenha("abc1")).toMatch(/mínimo de 8 caracteres/);
    expect(validarSenha("somenteletras")).toMatch(/pelo menos um número/);
    expect(validarSenha("12345678")).toMatch(/pelo menos uma letra/);
  });
});

describe("traduzirErroAuth", () => {
  const erro = (mensagem: string, code?: string) => new AuthError(mensagem, 400, code);

  it("traduz os erros mais comuns do Supabase", () => {
    expect(traduzirErroAuth(erro("Invalid login credentials", "invalid_credentials"))).toBe("Email ou senha incorretos.");
    expect(traduzirErroAuth(erro("Email not confirmed", "email_not_confirmed"))).toMatch(/não foi confirmado/);
    expect(traduzirErroAuth(erro("User already registered", "user_already_exists"))).toMatch(/já está cadastrado/);
    expect(traduzirErroAuth(erro("email rate limit exceeded", "over_email_send_rate_limit"))).toMatch(/Aguarde/);
  });

  it("reconhece pela mensagem quando não há código", () => {
    expect(traduzirErroAuth(erro("Email not confirmed"))).toMatch(/não foi confirmado/);
    expect(traduzirErroAuth(new Error("Failed to fetch"))).toMatch(/conectar ao servidor/);
  });
});
