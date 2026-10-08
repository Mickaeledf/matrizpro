import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Campo } from "@/components/Campo";
import { CategoriaLancamento, Lote, TipoLancamento } from "@/types";
import { formatarData, formatarMoeda, hojeISO } from "@/lib/date";
import { campoData, decimalPositivo, ErrosFormulario, numero, validar } from "@/lib/validacao";
import { estatisticasLote } from "@/utils/metricas";
import { cn } from "@/lib/utils";

const categoriasCusto: CategoriaLancamento[] = ["Ração", "Medicamentos", "Vacinas", "Mão de obra", "Instalações", "Outros"];
// Venda de leitões é registrada pelo botão de venda (cada leitão com seu valor), não como lançamento manual
const categoriasReceita: CategoriaLancamento[] = ["Outros"];

export function FinanceiroTab({ lote }: { lote: Lote }) {
  const { addLancamento, deleteLancamento } = useStore();
  const [form, setForm] = useState({
    tipo: "custo" as TipoLancamento,
    categoria: "Ração" as CategoriaLancamento,
    descricao: "",
    valor: "",
    data: hojeISO(),
  });
  const [erros, setErros] = useState<ErrosFormulario>({});
  const est = estatisticasLote(lote);

  const salvar = () => {
    const r = validar(z.object({ valor: decimalPositivo, data: campoData }), {
      valor: numero(form.valor),
      data: form.data,
    });
    if (!r.ok) return setErros(r.erros);
    addLancamento(lote.id, {
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao.trim(),
      valor: r.dados.valor,
      data: r.dados.data,
    });
    setForm({ ...form, descricao: "", valor: "" });
    setErros({});
  };

  const lancamentos = [...lote.lancamentos].sort((a, b) => b.data.localeCompare(a.data));
  const categorias = form.tipo === "custo" ? categoriasCusto : categoriasReceita;

  const resumo = [
    { label: "Custos", valor: formatarMoeda(est.totalCustos), sub: est.custosSaude > 0 ? `inclui ${formatarMoeda(est.custosSaude)} de saúde` : undefined },
    {
      label: "Receitas",
      valor: formatarMoeda(est.totalReceitas),
      sub: est.receitaVendas > 0 ? `inclui ${formatarMoeda(est.receitaVendas)} em vendas de leitões` : undefined,
    },
    { label: "Saldo", valor: formatarMoeda(est.saldo), cor: est.saldo < 0 ? "text-destructive" : "text-success" },
    { label: "Custo por kg produzido", valor: est.custoPorKg !== null ? formatarMoeda(est.custoPorKg) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumo.map((r) => (
          <div key={r.label} className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">{r.label}</p>
            <p className={cn("text-lg font-bold", r.cor)}>{r.valor}</p>
            {r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Lance aqui os custos do lote (ração, vacinas, medicamentos, mão de obra). As vendas de leitões são feitas pelo
        botão <strong>Vender leitões</strong> e aparecem também em{" "}
        <Link to="/faturamento" className="text-primary underline-offset-2 hover:underline">
          Faturamento
        </Link>
        .
      </p>

      <div className="grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[140px_170px_1fr_130px_160px_auto]">
        <Campo label="Tipo">
          <Select
            value={form.tipo}
            onValueChange={(v) =>
              setForm({ ...form, tipo: v as TipoLancamento, categoria: v === "custo" ? "Ração" : "Outros" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custo">Custo</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Categoria">
          <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as CategoriaLancamento })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Descrição">
          <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Campo>
        <Campo label="Valor (R$)" erro={erros.valor}>
          <Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
        </Campo>
        <Campo label="Data" erro={erros.data}>
          <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </Campo>
        <Button className="lg:mt-6" onClick={salvar}>
          Lançar
        </Button>
      </div>

      {lancamentos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento financeiro neste lote.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{formatarData(l.data)}</TableCell>
                <TableCell>{l.categoria}</TableCell>
                <TableCell>{l.descricao || "—"}</TableCell>
                <TableCell className={cn("text-right font-medium", l.tipo === "custo" ? "text-destructive" : "text-success")}>
                  {l.tipo === "custo" ? "−" : "+"} {formatarMoeda(l.valor)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => deleteLancamento(lote.id, l.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
