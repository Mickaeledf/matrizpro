import { useEffect, useState } from "react";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useStore } from "@/store/useStore";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Campo } from "@/components/Campo";
import { StatusBadge } from "@/components/StatusBadge";
import { Leitao, Lote, StatusSaude, TipoRegistroSaude } from "@/types";
import { diasEntre, formatarData, formatarMoeda, formatarNumero, hojeISO } from "@/lib/date";
import { calcularGPD } from "@/utils/metricas";
import {
  campoDataNaoFutura,
  decimalNaoNegativo,
  decimalPositivo,
  ErrosFormulario,
  textoObrigatorio,
  numero,
  validar,
} from "@/lib/validacao";

const rotuloTipo: Record<TipoRegistroSaude, string> = {
  vacinacao: "Vacinação",
  medicacao: "Medicação",
  observacao: "Observação",
  tratamento: "Tratamento",
};

export function LeitaoDetalheSheet({
  lote,
  leitao,
  onOpenChange,
}: {
  lote: Lote;
  leitao: Leitao | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { addPesagem, deletePesagem, addRegistroSaude, deleteRegistroSaude, updateLeitao } = useStore();

  const [pesagem, setPesagem] = useState({ peso: "", data: hojeISO() });
  const [errosPesagem, setErrosPesagem] = useState<ErrosFormulario>({});
  const [saude, setSaude] = useState({
    tipo: "observacao" as TipoRegistroSaude,
    descricao: "",
    data: hojeISO(),
    medicamento: "",
    dose: "",
    veterinario: "",
    custo: "",
  });
  const [errosSaude, setErrosSaude] = useState<ErrosFormulario>({});

  useEffect(() => {
    setPesagem({ peso: "", data: hojeISO() });
    setErrosPesagem({});
    setErrosSaude({});
  }, [leitao?.id]);

  if (!leitao) return <Sheet open={false} onOpenChange={onOpenChange} />;

  const gpd = calcularGPD(leitao);
  const dadosGrafico = [
    { dia: 0, peso: leitao.pesoNascimento },
    ...leitao.pesagens.map((p) => ({ dia: diasEntre(leitao.dataNascimento, p.data), peso: p.peso })),
  ];

  const salvarPesagem = () => {
    const r = validar(
      z.object({ peso: decimalPositivo.max(200, "Valor muito alto."), data: campoDataNaoFutura }),
      { peso: numero(pesagem.peso), data: pesagem.data }
    );
    if (!r.ok) return setErrosPesagem(r.erros);
    if (r.dados.data < leitao.dataNascimento) return setErrosPesagem({ data: "Data anterior ao nascimento." });
    addPesagem(lote.id, leitao.id, r.dados.peso, r.dados.data);
    setPesagem({ peso: "", data: hojeISO() });
    setErrosPesagem({});
  };

  const salvarSaude = () => {
    // Tratamento, medicação e vacinação têm custo: obrigatório informar (pode ser 0).
    const custoObrigatorio = saude.tipo !== "observacao";
    const r = validar(
      z.object({
        descricao: textoObrigatorio("Descreva o registro."),
        data: campoDataNaoFutura,
        custo: custoObrigatorio
          ? z
              .number({ invalid_type_error: "Informe o custo (use 0 se não teve custo)." })
              .min(0, "O valor não pode ser negativo.")
          : decimalNaoNegativo.optional(),
      }),
      {
        descricao: saude.descricao,
        data: saude.data,
        custo: saude.custo.trim() ? numero(saude.custo) : custoObrigatorio ? NaN : undefined,
      }
    );
    if (!r.ok) return setErrosSaude(r.erros);
    addRegistroSaude(lote.id, leitao.id, {
      tipo: saude.tipo,
      descricao: r.dados.descricao,
      data: r.dados.data,
      medicamento: saude.medicamento.trim() || undefined,
      dose: saude.dose.trim() || undefined,
      veterinario: saude.veterinario.trim() || undefined,
      custo: r.dados.custo,
    });
    setSaude({ ...saude, descricao: "", medicamento: "", dose: "", custo: "" });
    setErrosSaude({});
  };

  const registros = [...leitao.registrosSaude].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <Sheet open={!!leitao} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Leitão {leitao.identificador}</SheetTitle>
          <SheetDescription>
            Lote {lote.nome} · {leitao.sexo} · nascido em {formatarData(leitao.dataNascimento)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge status={leitao.status} />
          <StatusBadge status={leitao.statusSaude} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Nascimento</p>
            <p className="font-bold">{formatarNumero(leitao.pesoNascimento, 2)} kg</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Peso Atual</p>
            <p className="font-bold">{formatarNumero(leitao.pesoAtual, 2)} kg</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">GPD</p>
            <p className="font-bold">{gpd !== null ? `${Math.round(gpd * 1000)} g/dia` : "—"}</p>
          </div>
        </div>

        <div className="mt-4">
          <Campo label="Status de saúde">
            <Select
              value={leitao.statusSaude}
              onValueChange={(v) => updateLeitao(lote.id, leitao.id, { statusSaude: v as StatusSaude })}
            >
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

        <Separator className="my-6" />

        <h3 className="mb-3 font-semibold">Pesagens</h3>
        {leitao.pesagens.length > 0 && (
          <ChartContainer config={{ peso: { label: "Peso (kg)", color: "hsl(var(--primary))" } }} className="mb-4 h-40 w-full">
            <LineChart data={dadosGrafico} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="dia"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickLine={false}
                axisLine={false}
                tickFormatter={(d) => `${d}d`}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => `Dia ${p?.[0]?.payload?.dia}`} />} />
              <Line dataKey="peso" type="monotone" stroke="var(--color-peso)" strokeWidth={2} dot />
            </LineChart>
          </ChartContainer>
        )}
        <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
          <Campo label="Peso (kg)" erro={errosPesagem.peso}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={pesagem.peso}
              onChange={(e) => setPesagem({ ...pesagem, peso: e.target.value })}
            />
          </Campo>
          <Campo label="Data" erro={errosPesagem.data}>
            <Input type="date" value={pesagem.data} onChange={(e) => setPesagem({ ...pesagem, data: e.target.value })} />
          </Campo>
          <Button className="mt-6" onClick={salvarPesagem} disabled={leitao.status !== "Ativo"}>
            Registrar
          </Button>
        </div>
        <ul className="mt-3 divide-y text-sm">
          {[...leitao.pesagens].reverse().map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <span>{formatarData(p.data)}</span>
              <span className="font-medium">{formatarNumero(p.peso, 2)} kg</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir pesagem"
                onClick={() => deletePesagem(lote.id, leitao.id, p.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
          {leitao.pesagens.length === 0 && <li className="py-2 text-muted-foreground">Nenhuma pesagem registrada.</li>}
        </ul>

        <Separator className="my-6" />

        <h3 className="mb-3 font-semibold">Registros de Saúde</h3>
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Tipo">
              <Select value={saude.tipo} onValueChange={(v) => setSaude({ ...saude, tipo: v as TipoRegistroSaude })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(rotuloTipo).map(([valor, rotulo]) => (
                    <SelectItem key={valor} value={valor}>
                      {rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Data" erro={errosSaude.data}>
              <Input type="date" value={saude.data} onChange={(e) => setSaude({ ...saude, data: e.target.value })} />
            </Campo>
          </div>
          <Campo label="Descrição" erro={errosSaude.descricao}>
            <Textarea rows={2} value={saude.descricao} onChange={(e) => setSaude({ ...saude, descricao: e.target.value })} />
          </Campo>
          {saude.tipo !== "observacao" && (
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Medicamento/Vacina">
                <Input value={saude.medicamento} onChange={(e) => setSaude({ ...saude, medicamento: e.target.value })} />
              </Campo>
              <Campo label="Dose">
                <Input value={saude.dose} onChange={(e) => setSaude({ ...saude, dose: e.target.value })} />
              </Campo>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Veterinário">
              <Input value={saude.veterinario} onChange={(e) => setSaude({ ...saude, veterinario: e.target.value })} />
            </Campo>
            <Campo label={saude.tipo === "observacao" ? "Custo (R$, opcional)" : "Custo (R$)"} erro={errosSaude.custo}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={saude.custo}
                onChange={(e) => setSaude({ ...saude, custo: e.target.value })}
              />
            </Campo>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvarSaude}>Adicionar Registro</Button>
          </div>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {registros.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
              <div>
                <p className="font-medium">
                  {rotuloTipo[r.tipo]} · {formatarData(r.data)}
                </p>
                <p className="text-foreground/80">{r.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {[r.medicamento, r.dose, r.veterinario && `Vet: ${r.veterinario}`, r.custo ? formatarMoeda(r.custo) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir registro"
                onClick={() => deleteRegistroSaude(lote.id, leitao.id, r.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
          {registros.length === 0 && <li className="text-muted-foreground">Nenhum registro de saúde.</li>}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
