import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Pencil, PlusCircle, Trash2, Wallet } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Campo } from "@/components/Campo";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import { Procedencia, Reprodutor, StatusReprodutor } from "@/types";
import { ProcedenciaCampos, procedenciaPadrao, validarPrecoCompra } from "@/components/ProcedenciaCampos";
import { VendaAnimalDialog } from "@/components/venda/VendaDialogs";
import { formatarData, formatarMoeda, formatarNumero, hojeISO } from "@/lib/date";
import { campoDataNaoFutura, ErrosFormulario, numero, textoObrigatorio, validar } from "@/lib/validacao";

const RACAS = ["Duroc", "Pietrain", "Large White", "Landrace", "Hampshire", "Sintético", "Outra"];

const schema = z
  .object({
    identificador: textoObrigatorio("Informe o identificador."),
    raca: textoObrigatorio("Informe a raça."),
    dataNascimento: campoDataNaoFutura,
    dataEntrada: campoDataNaoFutura,
    status: z.enum(["Ativo", "Inativo", "Descartado"]),
    observacoes: z.string().optional(),
  })
  .refine((d) => d.dataEntrada >= d.dataNascimento, {
    path: ["dataEntrada"],
    message: "A entrada não pode ser antes do nascimento.",
  });

function ReprodutorDialog({
  open,
  onOpenChange,
  reprodutor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reprodutor: Reprodutor | null;
}) {
  const { reprodutores, addReprodutor, updateReprodutor } = useStore();
  const vazio = {
    identificador: "",
    raca: "Duroc",
    dataNascimento: hojeISO(),
    dataEntrada: hojeISO(),
    status: "Ativo" as StatusReprodutor,
    procedencia: "Comprada" as Procedencia,
    preco: "",
    observacoes: "",
  };
  const [form, setForm] = useState(vazio);
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (!open) return;
    setErros({});
    setForm(
      reprodutor
        ? {
            identificador: reprodutor.identificador,
            raca: reprodutor.raca,
            dataNascimento: reprodutor.dataNascimento,
            dataEntrada: reprodutor.dataEntrada,
            status: reprodutor.status,
            procedencia: reprodutor.procedencia ?? procedenciaPadrao(reprodutor.precoAquisicao),
            preco: reprodutor.precoAquisicao ? String(reprodutor.precoAquisicao) : "",
            observacoes: reprodutor.observacoes || "",
          }
        : vazio
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reprodutor]);

  const salvar = () => {
    const r = validar(schema, form);
    const erroPreco = validarPrecoCompra(form.procedencia, form.preco);
    if (!r.ok || erroPreco) return setErros({ ...(r.ok ? {} : r.erros), ...(erroPreco ? { preco: erroPreco } : {}) });
    const dados = {
      ...r.dados,
      procedencia: form.procedencia,
      precoAquisicao: form.procedencia === "Comprada" ? numero(form.preco) : 0,
    };
    const duplicado = reprodutores.some(
      (x) => x.id !== reprodutor?.id && x.identificador.trim().toLowerCase() === r.dados.identificador.toLowerCase()
    );
    if (duplicado) return setErros({ identificador: "Já existe um reprodutor com este identificador." });
    if (reprodutor) updateReprodutor(reprodutor.id, dados);
    else addReprodutor(dados);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{reprodutor ? "Editar Reprodutor" : "Adicionar Reprodutor"}</DialogTitle>
          <DialogDescription>Machos reprodutores (cachaços) usados nas coberturas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Identificador" erro={erros.identificador}>
              <Input
                placeholder="Ex: R-07"
                value={form.identificador}
                onChange={(e) => setForm({ ...form, identificador: e.target.value })}
              />
            </Campo>
            <Campo label="Raça" erro={erros.raca}>
              <Select value={form.raca} onValueChange={(v) => setForm({ ...form, raca: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACAS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nascimento" erro={erros.dataNascimento}>
              <Input type="date" value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} />
            </Campo>
            <Campo label="Entrada no plantel" erro={erros.dataEntrada}>
              <Input type="date" value={form.dataEntrada} onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })} />
            </Campo>
          </div>
          <ProcedenciaCampos
            feminino={false}
            procedencia={form.procedencia}
            preco={form.preco}
            erro={erros.preco}
            onChange={(v) => setForm({ ...form, procedencia: v.procedencia, preco: v.preco })}
          />
          <Campo label="Situação" ajuda={reprodutor?.venda ? "Vendido — para desfazer, use o Faturamento." : undefined}>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as StatusReprodutor })}
              disabled={!!reprodutor?.venda}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Observações">
            <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Campo>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>{reprodutor ? "Salvar" : "Adicionar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReprodutoresPage() {
  const { reprodutores, matrizes, lotes, deleteReprodutor } = useStore();
  const { confirmar, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Reprodutor | null>(null);
  const [vendendo, setVendendo] = useState<Reprodutor | null>(null);

  // Desempenho de cada reprodutor a partir dos ciclos das matrizes
  const desempenho = useMemo(() => {
    const vivosPorLote = new Map(lotes.map((l) => [l.id, l.nascidosVivos]));
    const mapa = new Map<string, { coberturas: number; partos: number; falhas: number; vivos: number; ultima?: string }>();
    for (const m of matrizes) {
      for (const c of m.ciclos) {
        const chave = c.reprodutorId ?? `nome:${c.reprodutor ?? ""}`;
        const d = mapa.get(chave) ?? { coberturas: 0, partos: 0, falhas: 0, vivos: 0 };
        d.coberturas += 1;
        if (c.status === "Falhou") d.falhas += 1;
        if (c.dataParto) {
          d.partos += 1;
          d.vivos += (c.loteId && vivosPorLote.get(c.loteId)) || 0;
        }
        if (!d.ultima || c.dataCobertura > d.ultima) d.ultima = c.dataCobertura;
        mapa.set(chave, d);
      }
    }
    return mapa;
  }, [matrizes, lotes]);

  const lista = [...reprodutores].sort((a, b) => a.identificador.localeCompare(b.identificador, "pt-BR", { numeric: true }));

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Reprodutores</h1>
      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Machos reprodutores</h2>
              <p className="text-sm text-muted-foreground">
                Cadastro dos cachaços e desempenho nas coberturas (taxa de prenhez e leitões nascidos vivos).
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                setEditando(null);
                setOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4" /> Adicionar Reprodutor
            </Button>
          </div>

          {lista.length === 0 ? (
            <p className="py-12 text-center text-sm text-primary">Nenhum reprodutor cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Procedência</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Coberturas</TableHead>
                  <TableHead>Taxa de prenhez</TableHead>
                  <TableHead>Média nascidos vivos</TableHead>
                  <TableHead>Última cobertura</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((r) => {
                  const d = desempenho.get(r.id);
                  const finalizadas = d ? d.partos + d.falhas : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.identificador}</TableCell>
                      <TableCell>{r.raca}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {(r.procedencia ?? procedenciaPadrao(r.precoAquisicao)) === "Comprada"
                          ? `Comprado · ${formatarMoeda(r.precoAquisicao ?? 0)}`
                          : "Nascido aqui"}
                        {r.venda && (
                          <span className="block text-xs text-success">Vendido · {formatarMoeda(r.venda.valor)}</span>
                        )}
                      </TableCell>
                      <TableCell>{formatarData(r.dataEntrada)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>{d?.coberturas ?? 0}</TableCell>
                      <TableCell>{finalizadas > 0 ? `${formatarNumero(((d?.partos ?? 0) / finalizadas) * 100)}%` : "—"}</TableCell>
                      <TableCell>{d && d.partos > 0 ? formatarNumero(d.vivos / d.partos) : "—"}</TableCell>
                      <TableCell>{formatarData(d?.ultima)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!r.venda && r.status !== "Descartado" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Vender"
                              title="Vender (descarte)"
                              onClick={() => setVendendo(r)}
                            >
                              <Wallet className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar"
                            onClick={() => {
                              setEditando(r);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir"
                            onClick={() =>
                              confirmar({
                                titulo: `Excluir o reprodutor ${r.identificador}?`,
                                descricao:
                                  "Os ciclos já registrados continuam mostrando o nome dele. Se ele saiu do plantel, prefira marcar como \"Descartado\".",
                                onConfirm: () => deleteReprodutor(r.id),
                              })
                            }
                          >
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
        </CardContent>
      </Card>
      <ReprodutorDialog open={open} onOpenChange={setOpen} reprodutor={editando} />
      {vendendo && (
        <VendaAnimalDialog
          open={!!vendendo}
          onOpenChange={(o) => !o && setVendendo(null)}
          tipo="reprodutor"
          id={vendendo.id}
          identificador={vendendo.identificador}
        />
      )}
      {dialog}
    </div>
  );
}
