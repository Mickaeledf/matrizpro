import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react";
import { Lote } from "@/types";
import { formatarData, formatarNumero } from "@/lib/date";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import { LoteFormDialog } from "@/components/lote/LoteFormDialog";
import { estatisticasLote } from "@/utils/metricas";
import { Paginacao, usePaginacao } from "@/components/Paginacao";

export default function LotesPage() {
  const navigate = useNavigate();
  const { lotes, matrizes, deleteLote } = useStore();
  const { confirmar, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [busca, setBusca] = useState("");
  // O filtro pode vir pronto do Painel (ex.: /lotes?status=Ativo)
  const [searchParams] = useSearchParams();
  const [filtroStatus, setFiltroStatus] = useState(searchParams.get("status") ?? "todos");

  const filtrados = useMemo(
    () =>
      lotes
        .filter((l) => l.nome.toLowerCase().includes(busca.trim().toLowerCase()))
        .filter((l) => filtroStatus === "todos" || l.status === filtroStatus)
        .sort((a, b) => b.dataParto.localeCompare(a.dataParto)),
    [lotes, busca, filtroStatus]
  );

  const paginacao = usePaginacao(filtrados, 50);
  const nomesMatrizes = useMemo(() => new Map(matrizes.map((m) => [m.id, m.identificador])), [matrizes]);

  const nomeMatriz = (id: string) => nomesMatrizes.get(id) ?? "—";

  const excluir = (l: Lote) =>
    confirmar({
      titulo: `Excluir o lote ${l.nome}?`,
      descricao: `Todos os ${l.leitoes.length} leitão(ões), pesagens, registros de saúde, vacinas e lançamentos financeiros do lote serão excluídos. Esta ação não pode ser desfeita.`,
      onConfirm: () => deleteLote(l.id),
    });

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Lotes</h1>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Todos os Lotes</h2>
              <p className="text-sm text-muted-foreground">Gerencie e acompanhe todas as suas ninhadas de leitões.</p>
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Adicionar Novo Lote
            </Button>
          </div>

          {lotes.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nome" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Desmamado">Desmamado</SelectItem>
                  <SelectItem value="Vendido">Vendido</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {lotes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-primary">Nenhum lote encontrado. Comece adicionando um novo!</p>
            </div>
          ) : filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lote corresponde aos filtros.</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Lote</TableHead>
                  <TableHead>Matriz</TableHead>
                  <TableHead>Data do Parto</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Vivos / Mortos</TableHead>
                  <TableHead>Leitões Ativos</TableHead>
                  <TableHead>Peso Médio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginacao.visiveis.map((l) => {
                  const est = estatisticasLote(l);
                  return (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/lotes/${l.id}`)}>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell>{nomeMatriz(l.matrizId)}</TableCell>
                      <TableCell>{formatarData(l.dataParto)}</TableCell>
                      <TableCell>{est.idadeDias} dias</TableCell>
                      <TableCell>
                        {l.nascidosVivos} / {l.nascidosMortos}
                      </TableCell>
                      <TableCell>{est.registrados > 0 ? est.ativos : "—"}</TableCell>
                      <TableCell>{est.ativos > 0 ? `${formatarNumero(est.pesoMedio)} kg` : "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar"
                            onClick={() => {
                              setEditing(l);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir(l)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Paginacao {...paginacao} />
            </>
          )}
        </CardContent>
      </Card>

      <LoteFormDialog
        open={open}
        onOpenChange={setOpen}
        lote={editing}
        onSaved={(id) => !editing && navigate(`/lotes/${id}`)}
      />
      {dialog}
    </div>
  );
}
