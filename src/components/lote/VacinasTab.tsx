import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Campo } from "@/components/Campo";
import { Lote } from "@/types";
import { diasEntre, formatarData, hojeISO } from "@/lib/date";
import { campoData, ErrosFormulario, textoObrigatorio, validar } from "@/lib/validacao";
import { cn } from "@/lib/utils";

export function VacinasTab({ lote }: { lote: Lote }) {
  const { addVacinaPendente, marcarVacinaAplicada, deleteVacina } = useStore();
  const [form, setForm] = useState({ nome: "", dataAgendada: hojeISO() });
  const [erros, setErros] = useState<ErrosFormulario>({});

  const salvar = () => {
    const r = validar(z.object({ nome: textoObrigatorio("Informe a vacina."), dataAgendada: campoData }), form);
    if (!r.ok) return setErros(r.erros);
    addVacinaPendente(lote.id, r.dados);
    setForm({ nome: "", dataAgendada: form.dataAgendada });
    setErros({});
  };

  const vacinas = [...lote.vacinasPendentes].sort(
    (a, b) => Number(a.aplicada) - Number(b.aplicada) || a.dataAgendada.localeCompare(b.dataAgendada)
  );

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_200px_auto]">
        <Campo label="Vacina / Medicamento" erro={erros.nome}>
          <Input
            placeholder="Ex: Ferro dextrano, Circovírus"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </Campo>
        <Campo label="Data Agendada" erro={erros.dataAgendada}>
          <Input type="date" value={form.dataAgendada} onChange={(e) => setForm({ ...form, dataAgendada: e.target.value })} />
        </Campo>
        <Button className="sm:mt-6" onClick={salvar}>
          Agendar
        </Button>
      </div>

      {vacinas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma vacina agendada para este lote.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vacina</TableHead>
              <TableHead>Agendada</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacinas.map((v) => {
              const dias = diasEntre(hojeISO(), v.dataAgendada);
              const situacao = v.aplicada
                ? `Aplicada em ${formatarData(v.dataAplicacao)}`
                : dias < 0
                  ? `Atrasada ${Math.abs(dias)} dia(s)`
                  : dias === 0
                    ? "Hoje"
                    : `Em ${dias} dia(s)`;
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.nome}</TableCell>
                  <TableCell>{formatarData(v.dataAgendada)}</TableCell>
                  <TableCell
                    className={cn(
                      v.aplicada ? "text-success" : dias < 0 ? "font-medium text-destructive" : dias <= 1 ? "text-warning" : ""
                    )}
                  >
                    {situacao}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!v.aplicada && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => marcarVacinaAplicada(lote.id, v.id)}>
                          <CheckCircle2 className="h-4 w-4" /> Aplicada
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => deleteVacina(lote.id, v.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
