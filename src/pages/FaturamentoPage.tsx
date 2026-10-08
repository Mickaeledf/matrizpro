import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { PiggyBank, PlusCircle, Undo2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { VendaLeitoesDialog } from "@/components/venda/VendaDialogs";
import { Campo } from "@/components/Campo";
import { formatarData, formatarMoeda, formatarNumero, hojeISO, somarDias } from "@/lib/date";
import { agruparVendas, faturamentoPorMes, listarVendidos, resumirFaturamento, VendaAgrupada } from "@/utils/faturamento";

type Periodo = "mes" | "3m" | "12m" | "ano" | "tudo";

const ROTULO_PERIODO: Record<Periodo, string> = {
  mes: "Este mês",
  "3m": "3 meses",
  "12m": "12 meses",
  ano: "Este ano",
  tudo: "Tudo",
};

function inicioDoPeriodo(p: Periodo): string | null {
  const hoje = hojeISO();
  switch (p) {
    case "mes":
      return `${hoje.slice(0, 7)}-01`;
    case "3m":
      return somarDias(hoje, -90);
    case "12m":
      return somarDias(hoje, -365);
    case "ano":
      return `${hoje.slice(0, 4)}-01-01`;
    default:
      return null;
  }
}

const nomeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

export default function FaturamentoPage() {
  const navigate = useNavigate();
  const { lotes, matrizes, reprodutores, desfazerVendaLeitoes, desfazerVendaAnimal } = useStore();
  const { confirmar, dialog } = useConfirm();
  const [periodo, setPeriodo] = useState<Periodo>("12m");
  const [escolherLote, setEscolherLote] = useState(false);
  const [loteVenda, setLoteVenda] = useState<string>("");
  const [vendaAberta, setVendaAberta] = useState(false);

  const todos = useMemo(() => listarVendidos(lotes, matrizes, reprodutores), [lotes, matrizes, reprodutores]);
  const inicio = inicioDoPeriodo(periodo);
  const itens = useMemo(() => (inicio ? todos.filter((i) => i.data >= inicio) : todos), [todos, inicio]);
  const resumo = resumirFaturamento(itens);
  const vendas = agruparVendas(itens);
  const vendasLeitoes = vendas.filter((v) => v.tipo === "leitao");
  const vendasDescarte = vendas.filter((v) => v.tipo !== "leitao");
  const porMes = faturamentoPorMes(itens).map((m) => ({ ...m, rotulo: nomeMes(m.mes) }));

  const lotesComVivos = lotes.filter((l) => l.leitoes.some((lt) => lt.status === "Ativo"));
  const loteSelecionado = lotes.find((l) => l.id === loteVenda);

  const desfazer = (v: VendaAgrupada) =>
    confirmar({
      titulo: "Desfazer esta venda?",
      descricao:
        v.tipo === "leitao"
          ? `Os ${v.quantidade} leitão(ões) voltam para "Ativo" no lote ${v.loteNome} e o valor de ${formatarMoeda(v.valor)} sai do faturamento.`
          : `${v.itens[0].animal} volta para o plantel e o valor de ${formatarMoeda(v.valor)} sai do faturamento.`,
      confirmar: "Desfazer venda",
      onConfirm: () => {
        if (v.tipo === "leitao" && v.loteId) desfazerVendaLeitoes(v.loteId, v.vendaId);
        else if (v.animalId) desfazerVendaAnimal(v.tipo === "matriz" ? "matriz" : "reprodutor", v.animalId);
        toast.success("Venda desfeita.");
      },
    });

  const abrir = (v: VendaAgrupada) => {
    if (v.tipo === "leitao" && v.loteId) navigate(`/lotes/${v.loteId}`);
    else if (v.tipo === "matriz" && v.animalId) navigate(`/matrizes/${v.animalId}`);
    else navigate("/reprodutores");
  };

  const kpis = [
    { label: "Faturamento no período", valor: formatarMoeda(resumo.total), destaque: true },
    { label: "Leitões vendidos", valor: String(resumo.leitoes.quantidade), sub: formatarMoeda(resumo.leitoes.valor) },
    {
      label: "Preço médio por leitão",
      valor: resumo.leitoes.precoMedio !== null ? formatarMoeda(resumo.leitoes.precoMedio) : "—",
      sub: resumo.leitoes.precoKg !== null ? `${formatarMoeda(resumo.leitoes.precoKg)} por kg` : undefined,
    },
    { label: "Descarte vendido", valor: String(resumo.descarte.quantidade), sub: formatarMoeda(resumo.descarte.valor) },
  ];

  const TabelaVendas = ({ lista, tipo }: { lista: VendaAgrupada[]; tipo: "leitao" | "descarte" }) =>
    lista.length === 0 ? (
      <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma venda neste período.</p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>{tipo === "leitao" ? "Lote" : "Animal"}</TableHead>
            {tipo === "leitao" && <TableHead>Qtd.</TableHead>}
            <TableHead>Peso</TableHead>
            <TableHead>Comprador</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((v) => (
            <TableRow key={v.vendaId} onClick={() => abrir(v)}>
              <TableCell>{formatarData(v.data)}</TableCell>
              <TableCell className="font-medium">
                {tipo === "leitao" ? v.loteNome : `${v.itens[0].animal} (${v.tipo === "matriz" ? "matriz" : "reprodutor"})`}
                {tipo === "leitao" && v.quantidade <= 3 && (
                  <span className="block text-xs text-muted-foreground">{v.itens.map((i) => i.animal).join(", ")}</span>
                )}
              </TableCell>
              {tipo === "leitao" && <TableCell>{v.quantidade}</TableCell>}
              <TableCell>{v.pesoKg > 0 ? `${formatarNumero(v.pesoKg)} kg` : "—"}</TableCell>
              <TableCell>{v.comprador || "—"}</TableCell>
              <TableCell className="text-right font-medium text-success">{formatarMoeda(v.valor)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" aria-label="Desfazer venda" title="Desfazer venda" onClick={() => desfazer(v)}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
          <p className="text-sm text-muted-foreground">Vendas de leitões e de animais de descarte, separadas para o planejamento.</p>
        </div>
        <Button className="gap-2" onClick={() => setEscolherLote(true)} disabled={lotesComVivos.length === 0}>
          <PlusCircle className="h-4 w-4" /> Nova venda de leitões
        </Button>
      </div>

      <ToggleGroup
        type="single"
        variant="outline"
        value={periodo}
        onValueChange={(v) => v && setPeriodo(v as Periodo)}
        className="flex-wrap justify-start"
        aria-label="Período"
      >
        {(Object.keys(ROTULO_PERIODO) as Periodo[]).map((p) => (
          <ToggleGroupItem key={p} value={p}>
            {ROTULO_PERIODO[p]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className={`mt-2 text-2xl font-bold ${k.destaque ? "text-success" : "text-foreground"}`}>{k.valor}</p>
              {k.sub && <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-foreground">Faturamento por mês</h2>
          <p className="mb-4 text-sm text-muted-foreground">Leitões e descarte separados.</p>
          {porMes.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              <PiggyBank className="mr-2 h-5 w-5" /> Nenhuma venda no período.
            </div>
          ) : (
            <ChartContainer
              config={{
                leitoes: { label: "Leitões", color: "hsl(var(--success))" },
                descarte: { label: "Descarte", color: "hsl(var(--warning))" },
              }}
              className="h-64 w-full"
            >
              <BarChart data={porMes} margin={{ left: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="leitoes" stackId="a" fill="var(--color-leitoes)" maxBarSize={48} />
                <Bar dataKey="descarte" stackId="a" fill="var(--color-descarte)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="leitoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leitoes">Leitões ({vendasLeitoes.length})</TabsTrigger>
          <TabsTrigger value="descarte">Matrizes e reprodutores ({vendasDescarte.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="leitoes">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                Cada linha é uma venda (um ou mais leitões). Clique para abrir o lote; use ↶ para desfazer uma venda lançada errada.
              </p>
              <TabelaVendas lista={vendasLeitoes} tipo="leitao" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="descarte">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                Matrizes e reprodutores vendidos para descarte. Para vender, abra a matriz ou o reprodutor e use "Vender".
              </p>
              <TabelaVendas lista={vendasDescarte} tipo="descarte" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Escolha do lote para uma nova venda */}
      <Dialog open={escolherLote} onOpenChange={setEscolherLote}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova venda de leitões</DialogTitle>
            <DialogDescription>Escolha o lote de onde saem os leitões.</DialogDescription>
          </DialogHeader>
          <Campo label="Lote">
            <Select value={loteVenda} onValueChange={setLoteVenda}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotesComVivos.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome} — {l.leitoes.filter((lt) => lt.status === "Ativo").length} vivo(s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEscolherLote(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!loteSelecionado}
              onClick={() => {
                setEscolherLote(false);
                setVendaAberta(true);
              }}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {loteSelecionado && <VendaLeitoesDialog open={vendaAberta} onOpenChange={setVendaAberta} lote={loteSelecionado} />}
      {dialog}
    </div>
  );
}
