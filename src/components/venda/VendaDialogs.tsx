import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Campo } from "@/components/Campo";
import { Lote } from "@/types";
import { formatarMoeda, formatarNumero, hojeISO } from "@/lib/date";
import { campoDataNaoFutura, ErrosFormulario, numero, validar } from "@/lib/validacao";

type Modo = "kg" | "cabeca";

interface Linha {
  selecionado: boolean;
  peso: string;
  valor: string;
  /** true quando o usuário digitou o valor à mão (não recalcular pelo preço) */
  manual: boolean;
}

const arred = (v: number) => Math.round(v * 100) / 100;

/** Venda de leitões: um por um ou vários de uma vez, cada um com seu valor. */
export function VendaLeitoesDialog({
  open,
  onOpenChange,
  lote,
  selecionadosIniciais,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: Lote;
  /** Leitões já marcados ao abrir (ex.: venda de um leitão específico) */
  selecionadosIniciais?: string[];
}) {
  const { registrarVendaLeitoes } = useStore();
  const disponiveis = useMemo(() => lote.leitoes.filter((lt) => lt.status === "Ativo"), [lote.leitoes]);

  const [data, setData] = useState(hojeISO());
  const [comprador, setComprador] = useState("");
  const [modo, setModo] = useState<Modo>("kg");
  const [preco, setPreco] = useState("");
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (!open) return;
    setData(hojeISO());
    setComprador("");
    setPreco("");
    setErros({});
    const marcados = selecionadosIniciais ?? disponiveis.map((lt) => lt.id);
    setLinhas(
      Object.fromEntries(
        disponiveis.map((lt) => [
          lt.id,
          { selecionado: marcados.includes(lt.id), peso: String(lt.pesoAtual), valor: "", manual: false },
        ])
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Recalcula o valor de cada leitão pelo preço (exceto os digitados à mão)
  const calcular = (l: Linha, precoTxt = preco, modoAtual = modo): Linha => {
    if (l.manual) return l;
    const p = numero(precoTxt);
    if (!Number.isFinite(p) || p <= 0) return { ...l, valor: "" };
    const v = modoAtual === "kg" ? p * numero(l.peso) : p;
    return { ...l, valor: Number.isFinite(v) && v > 0 ? String(arred(v)) : "" };
  };

  const aplicarPreco = (precoTxt: string, modoAtual: Modo) =>
    setLinhas((atual) => Object.fromEntries(Object.entries(atual).map(([id, l]) => [id, calcular(l, precoTxt, modoAtual)])));

  const marcados = disponiveis.filter((lt) => linhas[lt.id]?.selecionado);
  const total = marcados.reduce((a, lt) => a + (numero(linhas[lt.id].valor) || 0), 0);
  const pesoTotal = marcados.reduce((a, lt) => a + (numero(linhas[lt.id].peso) || 0), 0);
  const todosMarcados = marcados.length === disponiveis.length && disponiveis.length > 0;

  const salvar = () => {
    const novos: ErrosFormulario = {};
    const d = validar(campoDataNaoFutura, data);
    if (!d.ok) novos.data = d.erros[""];
    else if (data < lote.dataParto) novos.data = "A venda não pode ser antes do nascimento.";
    if (marcados.length === 0) novos.geral = "Marque pelo menos um leitão.";
    for (const lt of marcados) {
      const l = linhas[lt.id];
      if (!(numero(l.valor) > 0)) novos[lt.id] = "Informe o valor";
      if (!(numero(l.peso) > 0)) novos[lt.id] = "Informe o peso";
    }
    if (Object.keys(novos).length > 0) {
      if (!novos.geral && Object.keys(novos).some((k) => k !== "data")) novos.geral = "Preencha o peso e o valor de todos os leitões marcados.";
      return setErros(novos);
    }

    registrarVendaLeitoes(
      lote.id,
      marcados.map((lt) => ({ leitaoId: lt.id, valor: arred(numero(linhas[lt.id].valor)), pesoKg: numero(linhas[lt.id].peso) })),
      { data, comprador: comprador.trim() || undefined }
    );
    toast.success(`${marcados.length} leitão(ões) vendido(s) por ${formatarMoeda(total)}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vender leitões — lote {lote.nome}</DialogTitle>
          <DialogDescription>
            Marque os leitões vendidos. Você pode vender um por um ou vários juntos; cada leitão fica com o seu valor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Data da venda" erro={erros.data}>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Campo>
          <Campo label="Comprador (opcional)">
            <Input value={comprador} onChange={(e) => setComprador(e.target.value)} placeholder="Ex.: Frigorífico São José" />
          </Campo>
          <Campo label="Forma de preço">
            <ToggleGroup
              type="single"
              variant="outline"
              value={modo}
              onValueChange={(v) => {
                if (!v) return;
                setModo(v as Modo);
                aplicarPreco(preco, v as Modo);
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="kg">Por kg</ToggleGroupItem>
              <ToggleGroupItem value="cabeca">Por cabeça</ToggleGroupItem>
            </ToggleGroup>
          </Campo>
          <Campo
            label={modo === "kg" ? "Preço por kg (R$)" : "Preço por leitão (R$)"}
            ajuda="Preenche o valor de todos os marcados. Depois você pode ajustar um a um."
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              value={preco}
              onChange={(e) => {
                setPreco(e.target.value);
                aplicarPreco(e.target.value, modo);
              }}
            />
          </Campo>
        </div>

        {disponiveis.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Não há leitões vivos disponíveis para venda neste lote.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Marcar todos"
                    checked={todosMarcados}
                    onCheckedChange={(c) =>
                      setLinhas((atual) =>
                        Object.fromEntries(Object.entries(atual).map(([id, l]) => [id, { ...l, selecionado: !!c }]))
                      )
                    }
                  />
                </TableHead>
                <TableHead>Leitão</TableHead>
                <TableHead className="w-32">Peso (kg)</TableHead>
                <TableHead className="w-36">Valor (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disponiveis.map((lt) => {
                const l = linhas[lt.id];
                if (!l) return null;
                const atualizar = (mud: Partial<Linha>) =>
                  setLinhas((atual) => ({ ...atual, [lt.id]: { ...atual[lt.id], ...mud } }));
                return (
                  <TableRow key={lt.id} className={l.selecionado ? "" : "opacity-60"}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Vender ${lt.identificador}`}
                        checked={l.selecionado}
                        onCheckedChange={(c) => atualizar({ selecionado: !!c })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {lt.identificador}
                      {erros[lt.id] && <span className="block text-xs text-destructive">{erros[lt.id]}</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.peso}
                        disabled={!l.selecionado}
                        onChange={(e) =>
                          setLinhas((atual) => ({ ...atual, [lt.id]: calcular({ ...atual[lt.id], peso: e.target.value }) }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.valor}
                        disabled={!l.selecionado}
                        onChange={(e) => atualizar({ valor: e.target.value, manual: true })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {erros.geral && <p className="text-sm text-destructive">{erros.geral}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm">
            <strong>{marcados.length}</strong> leitão(ões) · {formatarNumero(pesoTotal)} kg ·{" "}
            <strong className="text-success">{formatarMoeda(total)}</strong>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={disponiveis.length === 0}>
              Confirmar venda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Venda de descarte de uma matriz ou reprodutor. */
export function VendaAnimalDialog({
  open,
  onOpenChange,
  tipo,
  id,
  identificador,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "matriz" | "reprodutor";
  id: string;
  identificador: string;
}) {
  const { registrarVendaAnimal } = useStore();
  const [form, setForm] = useState({ data: hojeISO(), valor: "", peso: "", comprador: "" });
  const [erros, setErros] = useState<ErrosFormulario>({});

  useEffect(() => {
    if (open) {
      setForm({ data: hojeISO(), valor: "", peso: "", comprador: "" });
      setErros({});
    }
  }, [open]);

  const salvar = () => {
    const novos: ErrosFormulario = {};
    const d = validar(campoDataNaoFutura, form.data);
    if (!d.ok) novos.data = d.erros[""];
    if (!(numero(form.valor) > 0)) novos.valor = "Informe o valor da venda.";
    if (form.peso.trim() && !(numero(form.peso) > 0)) novos.peso = "Peso inválido.";
    if (Object.keys(novos).length > 0) return setErros(novos);
    registrarVendaAnimal(tipo, id, {
      data: form.data,
      valor: arred(numero(form.valor)),
      pesoKg: form.peso.trim() ? numero(form.peso) : undefined,
      comprador: form.comprador.trim() || undefined,
    });
    toast.success(`${tipo === "matriz" ? "Matriz" : "Reprodutor"} ${identificador} vendido(a) por ${formatarMoeda(numero(form.valor))}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Vender {tipo === "matriz" ? "matriz" : "reprodutor"} {identificador}
          </DialogTitle>
          <DialogDescription>
            Venda de descarte. O animal passa para "{tipo === "matriz" ? "Descartada" : "Descartado"}" e o valor entra no
            Faturamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Data da venda" erro={erros.data}>
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Campo>
            <Campo label="Valor (R$)" erro={erros.valor}>
              <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Peso (kg, opcional)" erro={erros.peso}>
              <Input type="number" min={0} step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
            </Campo>
            <Campo label="Comprador (opcional)">
              <Input value={form.comprador} onChange={(e) => setForm({ ...form, comprador: e.target.value })} />
            </Campo>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Confirmar venda</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
