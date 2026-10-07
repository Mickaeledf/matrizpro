import { describe, it, expect } from "vitest";
import { diasEntre, formatarData, parseData, somarDias } from "@/lib/date";

describe("datas no fuso local", () => {
  it("formata 'yyyy-MM-dd' sem voltar um dia", () => {
    expect(formatarData("2026-10-07")).toBe("07/10/2026");
    expect(parseData("2026-10-07")?.getDate()).toBe(7);
  });

  it("retorna traço para datas vazias ou inválidas", () => {
    expect(formatarData(undefined)).toBe("—");
    expect(formatarData("lixo")).toBe("—");
  });

  it("calcula dias de calendário entre datas", () => {
    expect(diasEntre("2026-10-01", "2026-10-07")).toBe(6);
    expect(diasEntre("2026-10-07", "2026-10-01")).toBe(-6);
  });

  it("soma dias atravessando meses", () => {
    expect(somarDias("2026-06-01", 114)).toBe("2026-09-23");
  });
});
