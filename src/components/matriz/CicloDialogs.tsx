import { useEffect, useState } from "react";
import { z } from "zod";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campo } from "@/components/Campo";
import { CicloReprodutivo, Matriz, TipoCobertura } from "@/types";
import { formatarData, hojeISO, somarDias } from "@/lib/date";
import { campoDataNaoFutura, ErrosFormulario, inteiroNaoNegativo, textoObrigatorio, numero, validar } from "@/lib/validacao";

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matriz: Matriz;
}

const Rodape = ({ onCancel, onSave, label }: { onCancel: () => void; onSave: () => void; label: string }) => (
  <div className="flex justify-end gap-3 pt-2">
    <Button variant="outline" onClick={onCancel}>
      Cancelar
    </Button>
    <Button onClick={onSave}>{label}</Button>
  </div>
);

export function CoberturaDialog({ open, onOpenChange, matriz }: BaseProps) {
  const { registrarCobertura, configuracoes } = useStore();
  const [form, setForm] = useState({
    dataCobertura: hojeISO(),
    tipoCobertura: "Inseminação artificial" as TipoCobertura,
    reprodutor: "",
    observacoes: "",
  });
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (open) {
      setErros({});
      setForm({ dataCobertura: hojeISO(), tipoCobertura: "Inseminação artificial", reprodutor: "", observacoes: "" });
    }
  }, [open]);

  const salvar = () => {
    const r = validar(z.object({ dataCobertura: campoDataNaoFutura }), form);
    if (!r.ok) return setErros(r.erros);
    registrarCobertura(matriz.id, {
      ...form,
      reprodutor: form.reprodutor.trim() || undefined,
      observacoes: form.observacoes.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Cobertura</DialogTitle>
          <DialogDescription>Matriz {matriz.identificador}. A data prevista de parto é calculada automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Campo
            label="Data da Cobertura"
            erro={erros.dataCobertura}
            ajuda={`Parto previsto: ${formatarData(somarDias(form.dataCobertura, configuracoes.diasGestacao))} (${configuracoes.diasGestacao} dias).`}
          >
            <Input
              type="date"
              value={form.dataCobertura}
              onChange={(e) => setForm({ ...form, dataCobertura: e.target.value })}
            />
          </Campo>
          <Campo label="Tipo">
            <Select
              value={form.tipoCobertura}
              onValueChange={(v) => setForm({ ...form, tipoCobertura: v as TipoCobertura })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inseminação artificial">Inseminação artificial</SelectItem>
                <SelectItem value="Monta natural">Monta natural</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Reprodutor / Sêmen (opcional)">
            <Input value={form.reprodutor} onChange={(e) => setForm({ ...form, reprodutor: e.target.value })} />
          </Campo>
          <Campo label="Observações">
            <Textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </Campo>
        </div>
        <Rodape onCancel={() => onOpenChange(false)} onSave={salvar} label="Registrar" />
      </DialogContent>
    </Dialog>
  );
}

export function PartoDialog({
  open,
  onOpenChange,
  matriz,
  ciclo,
  onSaved,
}: BaseProps & { ciclo: CicloReprodutivo | null; onSaved?: (loteId: string) => void }) {
  const { registrarParto, lotes } = useStore();
  const [form, setForm] = useState({ dataParto: hojeISO(), nascidosVivos: "", nascidosMortos: "0", nomeLote: "" });
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (open) {
      setErros({});
      const numeroParto = matriz.ciclos.filter((c) => c.dataParto).length + 1;
      setForm({
        dataParto: hojeISO(),
        nascidosVivos: "",
        nascidosMortos: "0",
        nomeLote: `${matriz.identificador}-P${numeroParto}`,
      });
    }
  }, [open, matriz]);

  const salvar = () => {
    if (!ciclo) return;
    const schema = z
      .object({
        dataParto: campoDataNaoFutura,
        nascidosVivos: inteiroNaoNegativo,
        nascidosMortos: inteiroNaoNegativo,
        nomeLote: textoObrigatorio("Informe o nome do lote."),
      })
      .refine((d) => d.dataParto >= ciclo.dataCobertura, {
        path: ["dataParto"],
        message: "O parto não pode ser antes da cobertura.",
      });
    const r = validar(schema, {
      ...form,
      nascidosVivos: numero(form.nascidosVivos),
      nascidosMortos: numero(form.nascidosMortos),
    });
    if (!r.ok) return setErros(r.erros);
    if (lotes.some((l) => l.nome.trim().toLowerCase() === r.dados.nomeLote.toLowerCase())) {
      return setErros({ nomeLote: "Já existe um lote com este nome." });
    }
    const loteId = registrarParto(matriz.id, ciclo.id, r.dados);
    onOpenChange(false);
    onSaved?.(loteId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Parto</DialogTitle>
          <DialogDescription>Um novo lote será criado automaticamente para a leitegada.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
          <Campo label="Nome do Lote" erro={erros.nomeLote}>
            <Input value={form.nomeLote} onChange={(e) => setForm({ ...form, nomeLote: e.target.value })} />
          </Campo>
        </div>
        <Rodape onCancel={() => onOpenChange(false)} onSave={salvar} label="Registrar Parto" />
      </DialogContent>
    </Dialog>
  );
}

export function DesmameDialog({ open, onOpenChange, matriz, ciclo }: BaseProps & { ciclo: CicloReprodutivo | null }) {
  const { registrarDesmame } = useStore();
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (open) {
      setErro(undefined);
      setData(hojeISO());
    }
  }, [open]);

  const salvar = () => {
    if (!ciclo) return;
    const r = validar(campoDataNaoFutura, data);
    if (!r.ok) return setErro(r.erros[""]);
    if (ciclo.dataParto && data < ciclo.dataParto) return setErro("O desmame não pode ser antes do parto.");
    registrarDesmame(matriz.id, ciclo.id, data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Desmame</DialogTitle>
          <DialogDescription>O lote vinculado será marcado como "Desmamado".</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Campo label="Data do Desmame" erro={erro}>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
        </div>
        <Rodape onCancel={() => onOpenChange(false)} onSave={salvar} label="Registrar" />
      </DialogContent>
    </Dialog>
  );
}
