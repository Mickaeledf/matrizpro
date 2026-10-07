import { useEffect, useState } from "react";
import { z } from "zod";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Campo } from "@/components/Campo";
import { Leitao, Lote, StatusLeitao, StatusSaude } from "@/types";
import { formatarNumero, hojeISO } from "@/lib/date";
import {
  campoDataNaoFutura,
  decimalPositivo,
  ErrosFormulario,
  textoObrigatorio,
  numero,
  validar,
} from "@/lib/validacao";

const Rodape = ({ onCancel, onSave, label }: { onCancel: () => void; onSave: () => void; label: string }) => (
  <div className="flex justify-end gap-3 pt-2">
    <Button variant="outline" onClick={onCancel}>
      Cancelar
    </Button>
    <Button onClick={onSave}>{label}</Button>
  </div>
);

const pesoNascimentoSchema = decimalPositivo.max(5, "Peso ao nascer acima de 5 kg — confira o valor.");

export function LeitaoFormDialog({
  open,
  onOpenChange,
  lote,
  leitao,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: Lote;
  leitao?: Leitao | null;
}) {
  const { addLeitao, updateLeitao } = useStore();
  const [form, setForm] = useState({
    identificador: "",
    sexo: "Macho" as Leitao["sexo"],
    pesoNascimento: "",
    dataNascimento: lote.dataParto,
    status: "Ativo" as StatusLeitao,
    statusSaude: "Saudável" as StatusSaude,
  });
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (!open) return;
    setErros({});
    setForm(
      leitao
        ? {
            identificador: leitao.identificador,
            sexo: leitao.sexo,
            pesoNascimento: String(leitao.pesoNascimento),
            dataNascimento: leitao.dataNascimento,
            status: leitao.status,
            statusSaude: leitao.statusSaude,
          }
        : {
            identificador: `${lote.nome}-${String(lote.leitoes.length + 1).padStart(2, "0")}`,
            sexo: "Macho",
            pesoNascimento: "",
            dataNascimento: lote.dataParto,
            status: "Ativo",
            statusSaude: "Saudável",
          }
    );
  }, [open, leitao, lote]);

  const salvar = () => {
    const schema = z.object({
      identificador: textoObrigatorio("Informe o identificador."),
      sexo: z.enum(["Macho", "Fêmea"]),
      pesoNascimento: pesoNascimentoSchema,
      dataNascimento: campoDataNaoFutura,
      status: z.enum(["Ativo", "Morto", "Vendido"]),
      statusSaude: z.enum(["Saudável", "Em observação", "Em tratamento", "Crítico"]),
    });
    const r = validar(schema, { ...form, pesoNascimento: numero(form.pesoNascimento) });
    if (!r.ok) return setErros(r.erros);
    const duplicado = lote.leitoes.some(
      (lt) => lt.id !== leitao?.id && lt.identificador.trim().toLowerCase() === r.dados.identificador.toLowerCase()
    );
    if (duplicado) return setErros({ identificador: "Já existe um leitão com este identificador no lote." });

    if (leitao) updateLeitao(lote.id, leitao.id, r.dados);
    else addLeitao(lote.id, r.dados);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{leitao ? "Editar Leitão" : "Adicionar Leitão"}</DialogTitle>
          <DialogDescription>Lote {lote.nome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Campo label="Identificador (brinco/mossa)" erro={erros.identificador}>
            <Input value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Sexo">
              <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as Leitao["sexo"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Fêmea">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Peso ao Nascer (kg)" erro={erros.pesoNascimento}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.pesoNascimento}
                onChange={(e) => setForm({ ...form, pesoNascimento: e.target.value })}
              />
            </Campo>
          </div>
          <Campo label="Data de Nascimento" erro={erros.dataNascimento}>
            <Input
              type="date"
              value={form.dataNascimento}
              onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Situação">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusLeitao })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Morto">Morto</SelectItem>
                  <SelectItem value="Vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Saúde">
              <Select value={form.statusSaude} onValueChange={(v) => setForm({ ...form, statusSaude: v as StatusSaude })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Saudável">Saudável</SelectItem>
                  <SelectItem value="Em observação">Em observação</SelectItem>
                  <SelectItem value="Em tratamento">Em tratamento</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </div>
        <Rodape onCancel={() => onOpenChange(false)} onSave={salvar} label={leitao ? "Salvar" : "Adicionar"} />
      </DialogContent>
    </Dialog>
  );
}

/** Cadastra vários leitões de uma vez, com identificadores sequenciais. */
export function CadastroRapidoDialog({
  open,
  onOpenChange,
  lote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: Lote;
}) {
  const { addLeitao } = useStore();
  const restantes = Math.max(0, lote.nascidosVivos - lote.leitoes.length);
  const [form, setForm] = useState({ quantidade: "", prefixo: "", pesoMedio: "" });
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (open) {
      setErros({});
      setForm({ quantidade: String(restantes || ""), prefixo: `${lote.nome}-`, pesoMedio: "" });
    }
  }, [open, restantes, lote.nome]);

  const salvar = () => {
    const schema = z.object({
      quantidade: z.number({ invalid_type_error: "Informe a quantidade." }).int().min(1, "Mínimo 1.").max(40, "Máximo 40 por vez."),
      prefixo: z.string(),
      pesoMedio: pesoNascimentoSchema,
    });
    const r = validar(schema, { ...form, quantidade: numero(form.quantidade), pesoMedio: numero(form.pesoMedio) });
    if (!r.ok) return setErros(r.erros);
    const inicio = lote.leitoes.length + 1;
    for (let i = 0; i < r.dados.quantidade; i++) {
      addLeitao(lote.id, {
        identificador: `${r.dados.prefixo}${String(inicio + i).padStart(2, "0")}`,
        sexo: "Macho",
        pesoNascimento: r.dados.pesoMedio,
        dataNascimento: lote.dataParto,
        status: "Ativo",
        statusSaude: "Saudável",
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Leitões</DialogTitle>
          <DialogDescription>
            Cria vários leitões com o mesmo peso ao nascer. Ajuste sexo e peso individual depois, se necessário.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Campo
              label="Quantidade"
              erro={erros.quantidade}
              ajuda={restantes > 0 ? `${restantes} nascido(s) vivo(s) ainda sem cadastro.` : undefined}
            >
              <Input
                type="number"
                min={1}
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              />
            </Campo>
            <Campo label="Peso médio ao nascer (kg)" erro={erros.pesoMedio}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.pesoMedio}
                onChange={(e) => setForm({ ...form, pesoMedio: e.target.value })}
              />
            </Campo>
          </div>
          <Campo label="Prefixo do identificador" ajuda={`Ex: ${form.prefixo}${String(lote.leitoes.length + 1).padStart(2, "0")}`}>
            <Input value={form.prefixo} onChange={(e) => setForm({ ...form, prefixo: e.target.value })} />
          </Campo>
        </div>
        <Rodape onCancel={() => onOpenChange(false)} onSave={salvar} label="Cadastrar" />
      </DialogContent>
    </Dialog>
  );
}

/** Pesagem de todos os leitões ativos do lote numa mesma data. */
export function PesagemLoteDialog({
  open,
  onOpenChange,
  lote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: Lote;
}) {
  const { addPesagem } = useStore();
  const ativos = lote.leitoes.filter((lt) => lt.status === "Ativo");
  const [data, setData] = useState(hojeISO());
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (open) {
      setData(hojeISO());
      setPesos({});
      setErros({});
    }
  }, [open]);

  const salvar = () => {
    const novosErros: ErrosFormulario = {};
    const dataOk = validar(campoDataNaoFutura, data);
    if (!dataOk.ok) novosErros.data = dataOk.erros[""];
    else if (data < lote.dataParto) novosErros.data = "A pesagem não pode ser antes do parto.";

    const preenchidos = Object.entries(pesos).filter(([, v]) => v.trim() !== "");
    if (preenchidos.length === 0) novosErros.geral = "Informe o peso de pelo menos um leitão.";
    for (const [id, v] of preenchidos) {
      const r = validar(decimalPositivo.max(200, "Valor muito alto."), numero(v));
      if (!r.ok) novosErros[id] = r.erros[""];
    }
    if (Object.keys(novosErros).length > 0) return setErros(novosErros);

    preenchidos.forEach(([id, v]) => addPesagem(lote.id, id, numero(v), data));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pesagem do Lote</DialogTitle>
          <DialogDescription>Deixe em branco os leitões que não foram pesados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Campo label="Data da Pesagem" erro={erros.data}>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          {ativos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum leitão ativo neste lote.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leitão</TableHead>
                  <TableHead>Peso Anterior</TableHead>
                  <TableHead className="w-36">Novo Peso (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ativos.map((lt) => (
                  <TableRow key={lt.id}>
                    <TableCell className="font-medium">{lt.identificador}</TableCell>
                    <TableCell>{formatarNumero(lt.pesoAtual, 2)} kg</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pesos[lt.id] ?? ""}
                        onChange={(e) => setPesos({ ...pesos, [lt.id]: e.target.value })}
                        aria-invalid={!!erros[lt.id]}
                        className={erros[lt.id] ? "border-destructive" : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {erros.geral && <p className="text-xs text-destructive">{erros.geral}</p>}
        </div>
        <Rodape onCancel={() => onOpenChange(false)} onSave={salvar} label="Salvar Pesagens" />
      </DialogContent>
    </Dialog>
  );
}
