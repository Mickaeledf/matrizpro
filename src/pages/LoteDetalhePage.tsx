import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, DollarSign, Pencil, PlusCircle, Scale, Syringe, Trash2, Users, Zap } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import { LoteFormDialog } from "@/components/lote/LoteFormDialog";
import { CadastroRapidoDialog, LeitaoFormDialog, PesagemLoteDialog } from "@/components/lote/LeitaoDialogs";
import { LeitaoDetalheSheet } from "@/components/lote/LeitaoDetalheSheet";
import { VacinasTab } from "@/components/lote/VacinasTab";
import { FinanceiroTab } from "@/components/lote/FinanceiroTab";
import { Leitao } from "@/types";
import { formatarData, formatarNumero } from "@/lib/date";
import { calcularGPD, estatisticasLote, leitoesAbaixoDaMedia } from "@/utils/metricas";
import { cn } from "@/lib/utils";

export default function LoteDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lotes, matrizes, configuracoes, deleteLeitao } = useStore();
  const { confirmar, dialog } = useConfirm();

  const [editarLote, setEditarLote] = useState(false);
  const [leitaoForm, setLeitaoForm] = useState<{ open: boolean; leitao: Leitao | null }>({ open: false, leitao: null });
  const [cadastroRapido, setCadastroRapido] = useState(false);
  const [pesagemLote, setPesagemLote] = useState(false);

  const lote = lotes.find((l) => l.id === id);

  if (!lote) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">Lote não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/lotes")}>
          Voltar para Lotes
        </Button>
      </div>
    );
  }

  const matriz = matrizes.find((m) => m.id === lote.matrizId);
  const est = estatisticasLote(lote);
  const leitaoSelecionado = lote.leitoes.find((lt) => lt.id === searchParams.get("leitao")) ?? null;
  const abaixoDaMedia = leitoesAbaixoDaMedia(lote, configuracoes.limiteBaixoPesoPercent);

  const abrirLeitao = (leitaoId: string | null) =>
    setSearchParams(leitaoId ? { leitao: leitaoId } : {}, { replace: true });

  const kpis = [
    { label: "Idade", valor: `${est.idadeDias} dias`, sub: `Parto em ${formatarData(lote.dataParto)}` },
    {
      label: "Leitões Ativos",
      valor: est.registrados > 0 ? `${est.ativos}` : "—",
      sub: est.registrados > 0 ? `${est.registrados} cadastrados · ${lote.nascidosVivos} nascidos vivos` : "Nenhum leitão cadastrado",
    },
    { label: "Peso Médio", valor: est.ativos > 0 ? `${formatarNumero(est.pesoMedio, 2)} kg` : "—" },
    { label: "GPD Médio", valor: est.gpdMedio !== null ? `${Math.round(est.gpdMedio * 1000)} g/dia` : "—", sub: "Ganho de peso diário" },
    {
      label: "Mortalidade",
      valor: est.registrados > 0 ? `${formatarNumero(est.mortalidadePercent)}%` : "—",
      sub: `Natimortos: ${formatarNumero(est.natimortalidadePercent)}%`,
    },
  ];

  const leitoes = [...lote.leitoes].sort((a, b) =>
    a.identificador.localeCompare(b.identificador, "pt-BR", { numeric: true })
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lotes")} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lote {lote.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusBadge status={lote.status} />
              <span>
                Matriz:{" "}
                {matriz ? (
                  <Link to={`/matrizes/${matriz.id}`} className="text-primary underline-offset-2 hover:underline">
                    {matriz.identificador}
                  </Link>
                ) : (
                  "não vinculada"
                )}
              </span>
              {lote.dataDesmame && <span>· Desmame em {formatarData(lote.dataDesmame)}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setEditarLote(true)}>
            <Pencil className="h-4 w-4" />
            Editar Lote
          </Button>
          <Button className="gap-2" onClick={() => setPesagemLote(true)} disabled={est.ativos === 0}>
            <Scale className="h-4 w-4" />
            Pesagem do Lote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{k.valor}</p>
              {k.sub && <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="leitoes" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start bg-muted">
          <TabsTrigger value="leitoes" className="gap-2">
            <Users className="h-4 w-4" /> Leitões
          </TabsTrigger>
          <TabsTrigger value="vacinas" className="gap-2">
            <Syringe className="h-4 w-4" /> Vacinas
            {est.vacinasPendentes > 0 && (
              <span className="rounded-full bg-warning px-1.5 text-xs text-warning-foreground">{est.vacinasPendentes}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="h-4 w-4" /> Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leitoes">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Clique em um leitão para ver pesagens e registros de saúde.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => setCadastroRapido(true)}>
                    <Zap className="h-4 w-4" /> Cadastro Rápido
                  </Button>
                  <Button className="gap-2" onClick={() => setLeitaoForm({ open: true, leitao: null })}>
                    <PlusCircle className="h-4 w-4" /> Adicionar Leitão
                  </Button>
                </div>
              </div>

              {leitoes.length === 0 ? (
                <p className="py-10 text-center text-sm text-primary">
                  Nenhum leitão cadastrado. Use o "Cadastro Rápido" para registrar a leitegada inteira de uma vez.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Peso Nasc.</TableHead>
                      <TableHead>Peso Atual</TableHead>
                      <TableHead>GPD</TableHead>
                      <TableHead>Saúde</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leitoes.map((lt) => {
                      const gpd = calcularGPD(lt);
                      const baixoGanho = abaixoDaMedia.has(lt.id);
                      return (
                        <TableRow key={lt.id} className="cursor-pointer" onClick={() => abrirLeitao(lt.id)}>
                          <TableCell className="font-medium">{lt.identificador}</TableCell>
                          <TableCell>{lt.sexo}</TableCell>
                          <TableCell>{formatarNumero(lt.pesoNascimento, 2)} kg</TableCell>
                          <TableCell>{formatarNumero(lt.pesoAtual, 2)} kg</TableCell>
                          <TableCell
                            className={cn(baixoGanho && "font-semibold text-destructive")}
                            title={baixoGanho ? `${abaixoDaMedia.get(lt.id)}% abaixo da média do lote` : undefined}
                          >
                            {gpd !== null ? `${Math.round(gpd * 1000)} g` : "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={lt.statusSaude} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={lt.status} />
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => setLeitaoForm({ open: true, leitao: lt })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir"
                                onClick={() =>
                                  confirmar({
                                    titulo: `Excluir o leitão ${lt.identificador}?`,
                                    descricao:
                                      "Pesagens e registros de saúde serão perdidos. Se o animal morreu ou foi vendido, prefira alterar a situação dele (isso mantém os indicadores corretos).",
                                    onConfirm: () => deleteLeitao(lote.id, lt.id),
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
        </TabsContent>

        <TabsContent value="vacinas">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <VacinasTab lote={lote} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <Card className="border border-border">
            <CardContent className="p-4 sm:p-6">
              <FinanceiroTab lote={lote} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LoteFormDialog open={editarLote} onOpenChange={setEditarLote} lote={lote} />
      <LeitaoFormDialog
        open={leitaoForm.open}
        onOpenChange={(open) => setLeitaoForm((s) => ({ ...s, open }))}
        lote={lote}
        leitao={leitaoForm.leitao}
      />
      <CadastroRapidoDialog open={cadastroRapido} onOpenChange={setCadastroRapido} lote={lote} />
      <PesagemLoteDialog open={pesagemLote} onOpenChange={setPesagemLote} lote={lote} />
      <LeitaoDetalheSheet lote={lote} leitao={leitaoSelecionado} onOpenChange={(o) => !o && abrirLeitao(null)} />
      {dialog}
    </div>
  );
}
