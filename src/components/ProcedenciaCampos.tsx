import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Campo } from "@/components/Campo";
import { Procedencia } from "@/types";
import { numero } from "@/lib/validacao";

/**
 * Procedência do animal + preço de compra.
 * - Comprada: o preço é obrigatório (entra no custo do plantel).
 * - Nascida na granja: sem preço de compra (o campo some).
 */
export function ProcedenciaCampos({
  procedencia,
  preco,
  onChange,
  erro,
  feminino = true,
}: {
  procedencia: Procedencia;
  preco: string;
  onChange: (v: { procedencia: Procedencia; preco: string }) => void;
  erro?: string;
  feminino?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Procedência">
        <ToggleGroup
          type="single"
          variant="outline"
          value={procedencia}
          onValueChange={(v) => v && onChange({ procedencia: v as Procedencia, preco: v === "Comprada" ? preco : "0" })}
          className="justify-start"
        >
          <ToggleGroupItem value="Comprada">{feminino ? "Comprada" : "Comprado"}</ToggleGroupItem>
          <ToggleGroupItem value="Nascida na granja">{feminino ? "Nascida aqui" : "Nascido aqui"}</ToggleGroupItem>
        </ToggleGroup>
      </Campo>
      {procedencia === "Comprada" ? (
        <Campo label="Preço de compra (R$)" erro={erro} ajuda="Obrigatório para animais comprados.">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={preco === "0" ? "" : preco}
            onChange={(e) => onChange({ procedencia, preco: e.target.value })}
          />
        </Campo>
      ) : (
        <Campo label="Preço de compra">
          <p className="flex h-10 items-center text-sm text-muted-foreground">Sem custo de compra (nasceu na granja).</p>
        </Campo>
      )}
    </div>
  );
}

/** Erro de validação do preço (ou undefined se estiver ok). */
export function validarPrecoCompra(procedencia: Procedencia, preco: string): string | undefined {
  if (procedencia !== "Comprada") return undefined;
  const v = numero(preco);
  return Number.isFinite(v) && v > 0 ? undefined : "Informe o preço de compra.";
}

/** Procedência de registros antigos (antes do campo existir). */
export const procedenciaPadrao = (preco?: number): Procedencia => (preco && preco > 0 ? "Comprada" : "Nascida na granja");
