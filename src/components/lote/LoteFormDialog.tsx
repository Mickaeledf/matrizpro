import { useEffect, useState } from "react";
import { z } from "zod";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo } from "@/components/Campo";
import { Lote, StatusLote } from "@/types";
import { hojeISO } from "@/lib/date";
import { campoData, campoDataNaoFutura, ErrosFormulario, inteiroNaoNegativo, textoObrigatorio, numero, validar } from "@/lib/validacao";

const SEM_MATRIZ = "__nenhuma__";

const schema = z
  .object({
    nome: textoObrigatorio("Informe o nome do lote."),
    matrizId: z.string(),
    dataParto: campoDataNaoFutura,
    nascidosVivos: inteiroNaoNegativo,
    nascidosMortos: inteiroNaoNegativo,
    status: z.enum(["Ativo", "Desmamado", "Vendido", "Finalizado"]),
    dataDesmame: campoData.optional(),
  })
  .refine((d) => !d.dataDesmame || d.dataDesmame >= d.dataParto, {
    path: ["dataDesmame"],
    message: "O desmame não pode ser antes do parto.",
  });

export function LoteFormDialog({
  open,
  onOpenChange,
  lote,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote?: Lote | null;
  onSaved?: (id: string) => void;
}) {
  const { lotes, matrizes, addLote, updateLote } = useStore();
  const [form, setForm] = useState({
    nome: "",
    matrizId: SEM_MATRIZ,
    dataParto: hojeISO(),
    nascidosVivos: "",
    nascidosMortos: "0",
    status: "Ativo" as StatusLote,
    dataDesmame: "",
  });
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (!open) return;
    setErros({});
    setForm(
      lote
        ? {
            nome: lote.nome,
            matrizId: lote.matrizId || SEM_MATRIZ,
            dataParto: lote.dataParto,
            nascidosVivos: String(lote.nascidosVivos),
            nascidosMortos: String(lote.nascidosMortos),
            status: lote.status,
            dataDesmame: lote.dataDesmame || "",
          }
        : {
            nome: "",
            matrizId: SEM_MATRIZ,
            dataParto: hojeISO(),
            nascidosVivos: "",
            nascidosMortos: "0",
            status: "Ativo",
            dataDesmame: "",
          }
    );
  }, [open, lote]);

  const handleSave = () => {
    const r = validar(schema, {
      ...form,
      matrizId: form.matrizId === SEM_MATRIZ ? "" : form.matrizId,
      nascidosVivos: numero(form.nascidosVivos),
      nascidosMortos: numero(form.nascidosMortos),
      dataDesmame: form.dataDesmame || undefined,
    });
    if (!r.ok) return setErros(r.erros);

    const duplicado = lotes.some(
      (l) => l.id !== lote?.id && l.nome.trim().toLowerCase() === r.dados.nome.toLowerCase()
    );
    if (duplicado) return setErros({ nome: "Já existe um lote com este nome." });

    if (lote) {
      updateLote(lote.id, r.dados);
      onSaved?.(lote.id);
    } else {
      onSaved?.(addLote(r.dados));
    }
    onOpenChange(false);
  };

  const matrizesDisponiveis = matrizes.filter((m) => m.status === "Ativa" || m.id === lote?.matrizId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{lote ? "Editar Lote" : "Adicionar Novo Lote"}</DialogTitle>
          <DialogDescription>
            {lote
              ? "Atualize as informações do lote."
              : "Dica: ao registrar o parto na página da matriz, o lote é criado automaticamente."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Campo label="Nome do Lote" erro={erros.nome}>
            <Input placeholder="Ex: Lote-001" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Campo>
          <Campo label="Matriz">
            <Select value={form.matrizId} onValueChange={(v) => setForm({ ...form, matrizId: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_MATRIZ}>Sem matriz vinculada</SelectItem>
                {matrizesDisponiveis.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.identificador}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Data do Parto" erro={erros.dataParto}>
            <Input type="date" value={form.dataParto} onChange={(e) => setForm({ ...form, dataParto: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nascidos Vivos" erro={erros.nascidosVivos}>
              <Input
                type="number"
                min={0}
                value={form.nascidosVivos}
                onChange={(e) => setForm({ ...form, nascidosVivos: e.target.value })}
              />
            </Campo>
            <Campo label="Nascidos Mortos" erro={erros.nascidosMortos}>
              <Input
                type="number"
                min={0}
                value={form.nascidosMortos}
                onChange={(e) => setForm({ ...form, nascidosMortos: e.target.value })}
              />
            </Campo>
          </div>
          {lote && (
            <div className="grid grid-cols-2 gap-4">
              <Campo
                label="Status"
                ajuda={lote.status === "Vendido" ? "Definido pelas vendas no Faturamento." : "\"Vendido\" é automático ao vender todos os leitões."}
              >
                {/* "Vendido" é consequência das vendas registradas, não se escolhe à mão */}
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as StatusLote })}
                  disabled={lote.status === "Vendido"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Desmamado">Desmamado</SelectItem>
                    {lote.status === "Vendido" && <SelectItem value="Vendido">Vendido</SelectItem>}
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Data do Desmame" erro={erros.dataDesmame}>
                <Input
                  type="date"
                  value={form.dataDesmame}
                  onChange={(e) => setForm({ ...form, dataDesmame: e.target.value })}
                />
              </Campo>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{lote ? "Salvar" : "Salvar Lote"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
