import { describe, it, expect } from "vitest";
import { cpfValido, formatarCelular, formatarCpf } from "@/lib/pagamentos";

describe("dados do pagador (PIX)", () => {
  it("valida os dígitos do CPF", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });

  it("formata CPF e celular enquanto digita", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
    expect(formatarCelular("62999998888")).toBe("(62) 99999-8888");
    expect(formatarCelular("6233334444")).toBe("(62) 3333-4444");
  });
});
