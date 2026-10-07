import { z } from "zod";
import { hojeISO } from "@/lib/date";

export type ErrosFormulario = Record<string, string>;

/** Valida dados com um schema zod e devolve os erros por campo (vazio = válido). */
export function validar<T>(schema: z.ZodType<T>, dados: unknown): { ok: true; dados: T } | { ok: false; erros: ErrosFormulario } {
  const resultado = schema.safeParse(dados);
  if (resultado.success) return { ok: true, dados: resultado.data };
  const erros: ErrosFormulario = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path.join(".");
    if (!erros[campo]) erros[campo] = issue.message;
  }
  return { ok: false, erros };
}

export const campoData = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");

export const campoDataNaoFutura = campoData.refine(
  (v) => v <= hojeISO(),
  "A data não pode estar no futuro."
);

export const inteiroNaoNegativo = z
  .number({ invalid_type_error: "Informe um número." })
  .int("Informe um número inteiro.")
  .min(0, "O valor não pode ser negativo.");

export const decimalPositivo = z
  .number({ invalid_type_error: "Informe um número." })
  .positive("O valor deve ser maior que zero.");

export const decimalNaoNegativo = z
  .number({ invalid_type_error: "Informe um número." })
  .min(0, "O valor não pode ser negativo.");

export const textoObrigatorio = (msg = "Campo obrigatório.") => z.string().trim().min(1, msg);

/** Converte o valor de um input numérico; vazio vira NaN para a validação acusar. */
export const numero = (valor: string) => (valor.trim() === "" ? NaN : Number(valor.replace(",", ".")));
