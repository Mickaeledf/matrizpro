import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react";
import { Matriz } from "@/types";
import { formatarData } from "@/lib/date";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import { MatrizFormDialog } from "@/components/matriz/MatrizFormDialog";
import { Paginacao, usePaginacao } from "@/components/Paginacao";

export default function MatrizesPage() {
  const navigate = useNavigate();
  const { matrizes, lotes, deleteMatriz } = useStore();
  const { confirmar, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Matriz | null>(null);
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(
    () =>
      matrizes
        .filter((m) => m.identificador.toLowerCase().includes(busca.trim().toLowerCase()))
        .sort((a, b) => a.identificador.localeCompare(b.identificador, "pt-BR", { numeric: true })),
    [matrizes, busca]
  );

  const paginacao = usePaginacao(filtradas, 50);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (m: Matriz) => {
    setEditing(m);
    setOpen(true);
  };

  const excluir = (m: Matriz) => {
    const vinculados = lotes.filter((l) => l.matrizId === m.id).length;
    confirmar({
      titulo: `Excluir a matriz ${m.identificador}?`,
      descricao: (
        <>
          Esta ação não pode ser desfeita. O histórico de ciclos reprodutivos será perdido.
          {vinculados > 0 && (
            <strong className="mt-2 block text-foreground">
              {vinculados} lote(s) estão vinculados a ela e ficarão sem matriz. Se a matriz saiu do plantel,
              considere marcá-la como "Descartada" em vez de excluir.
            </strong>
          )}
        </>
      ),
      onConfirm: () => deleteMatriz(m.id),
    });
  };

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Matrizes</h1>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Todas as Matrizes</h2>
              <p className="text-sm text-muted-foreground">Gerencie e acompanhe todas as suas matrizes reprodutoras.</p>
            </div>
            <Button onClick={openNew} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Nova Matriz
            </Button>
          </div>

          {matrizes.length > 0 && (
            <div className="relative mb-4 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por identificador"
                className="pl-9"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          )}

          {matrizes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-primary">Nenhuma matriz encontrada. Comece adicionando uma nova!</p>
            </div>
          ) : filtradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma matriz corresponde à busca.</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Data de Entrada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status Reprodutivo</TableHead>
                  <TableHead>Partos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginacao.visiveis.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/matrizes/${m.id}`)}>
                    <TableCell className="font-medium">{m.identificador}</TableCell>
                    <TableCell>{m.raca || "—"}</TableCell>
                    <TableCell>{formatarData(m.dataEntrada)}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.statusReprodutivo} />
                    </TableCell>
                    <TableCell>{m.ciclos.filter((c) => c.dataParto).length}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => excluir(m)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Paginacao {...paginacao} />
            </>
          )}
        </CardContent>
      </Card>

      <MatrizFormDialog open={open} onOpenChange={setOpen} matriz={editing} />
      {dialog}
    </div>
  );
}
