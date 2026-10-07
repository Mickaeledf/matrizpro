import { useEffect, useState } from "react";
import { z } from "zod";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo } from "@/components/Campo";
import { Matriz, StatusMatriz, StatusReprodutivo } from "@/types";
import { hojeISO } from "@/lib/date";
import { campoDataNaoFutura, decimalNaoNegativo, ErrosFormulario, textoObrigatorio, numero, validar } from "@/lib/validacao";

const schema = z
  .object({
    identificador: textoObrigatorio("Informe o identificador."),
    raca: z.string().optional(),
    dataNascimento: campoDataNaoFutura,
    dataEntrada: campoDataNaoFutura,
    precoAquisicao: decimalNaoNegativo,
    statusReprodutivo: z.enum(["Vazia", "Gestante", "Lactante", "Desmamada"]),
    status: z.enum(["Ativa", "Inativa", "Descartada"]),
    observacoes: z.string().optional(),
  })
  .refine((d) => d.dataEntrada >= d.dataNascimento, {
    path: ["dataEntrada"],
    message: "A entrada não pode ser antes do nascimento.",
  });

const formVazio = () => ({
  identificador: "",
  raca: "",
  dataNascimento: hojeISO(),
  dataEntrada: hojeISO(),
  precoAquisicao: "0",
  statusReprodutivo: "Vazia" as StatusReprodutivo,
  status: "Ativa" as StatusMatriz,
  observacoes: "",
});

export function MatrizFormDialog({
  open,
  onOpenChange,
  matriz,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matriz?: Matriz | null;
  onSaved?: (id: string) => void;
}) {
  const { matrizes, addMatriz, updateMatriz } = useStore();
  const [form, setForm] = useState(formVazio);
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (!open) return;
    setErros({});
    setForm(
      matriz
        ? {
            identificador: matriz.identificador,
            raca: matriz.raca || "",
            dataNascimento: matriz.dataNascimento,
            dataEntrada: matriz.dataEntrada,
            precoAquisicao: String(matriz.precoAquisicao),
            statusReprodutivo: matriz.statusReprodutivo,
            status: matriz.status,
            observacoes: matriz.observacoes || "",
          }
        : formVazio()
    );
  }, [open, matriz]);

  const handleSave = () => {
    const resultado = validar(schema, { ...form, precoAquisicao: numero(form.precoAquisicao) });
    if (!resultado.ok) return setErros(resultado.erros);

    const duplicada = matrizes.some(
      (m) => m.id !== matriz?.id && m.identificador.trim().toLowerCase() === resultado.dados.identificador.toLowerCase()
    );
    if (duplicada) return setErros({ identificador: "Já existe uma matriz com este identificador." });

    if (matriz) {
      updateMatriz(matriz.id, resultado.dados);
      onSaved?.(matriz.id);
    } else {
      onSaved?.(addMatriz(resultado.dados));
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{matriz ? "Editar Matriz" : "Adicionar Nova Matriz"}</DialogTitle>
          <DialogDescription>
            {matriz ? "Atualize as informações da matriz." : "Preencha as informações para cadastrar uma nova matriz reprodutora."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Identificador (Brinco/Tatuagem)" erro={erros.identificador}>
            <Input
              placeholder="Ex: M-042"
              value={form.identificador}
              onChange={(e) => setForm({ ...form, identificador: e.target.value })}
            />
          </Campo>
            <Campo label="Raça / Linhagem">
              <Input placeholder="Ex: F1 (LW x LD)" value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} />
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Data de Nascimento" erro={erros.dataNascimento}>
              <Input
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
              />
            </Campo>
            <Campo label="Entrada no Plantel" erro={erros.dataEntrada}>
              <Input
                type="date"
                value={form.dataEntrada}
                onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })}
              />
            </Campo>
          </div>
          <Campo label="Preço de Aquisição (R$)" erro={erros.precoAquisicao} ajuda="Custo de compra da matriz.">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.precoAquisicao}
              onChange={(e) => setForm({ ...form, precoAquisicao: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              label={matriz ? "Status Reprodutivo" : "Status Reprodutivo Inicial"}
              ajuda={matriz ? "Atualizado automaticamente pelos ciclos." : undefined}
            >
              <Select
                value={form.statusReprodutivo}
                onValueChange={(v) => setForm({ ...form, statusReprodutivo: v as StatusReprodutivo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vazia">Vazia</SelectItem>
                  <SelectItem value="Gestante">Gestante</SelectItem>
                  <SelectItem value="Lactante">Lactante</SelectItem>
                  <SelectItem value="Desmamada">Desmamada</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Status no Plantel">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusMatriz })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Inativa">Inativa</SelectItem>
                  <SelectItem value="Descartada">Descartada</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>
          <Campo label="Observações">
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Campo>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{matriz ? "Salvar" : "Salvar Matriz"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
