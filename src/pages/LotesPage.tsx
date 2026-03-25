import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { Lote, StatusLote } from "@/types";
import { format } from "date-fns";

export default function LotesPage() {
  const { lotes, matrizes, addLote, updateLote, deleteLote } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [form, setForm] = useState({
    nome: "",
    matrizId: "",
    dataParto: format(new Date(), "yyyy-MM-dd"),
    nascidosVivos: 0,
    nascidosMortos: 0,
    status: "Ativo" as StatusLote,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      nome: "",
      matrizId: matrizes[0]?.id || "",
      dataParto: format(new Date(), "yyyy-MM-dd"),
      nascidosVivos: 0,
      nascidosMortos: 0,
      status: "Ativo",
    });
    setOpen(true);
  };

  const openEdit = (l: Lote) => {
    setEditing(l);
    setForm({
      nome: l.nome,
      matrizId: l.matrizId,
      dataParto: l.dataParto,
      nascidosVivos: l.nascidosVivos,
      nascidosMortos: l.nascidosMortos,
      status: l.status,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.nome) return;
    if (editing) {
      updateLote(editing.id, form);
    } else {
      addLote(form);
    }
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Lotes</h1>

      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Todos os Lotes</h2>
              <p className="text-sm text-muted-foreground">Gerencie e acompanhe todas as suas ninhadas de leitões.</p>
            </div>
            <Button onClick={openNew} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Novo Lote
            </Button>
          </div>

          {lotes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-primary">Nenhum lote encontrado. Comece adicionando um novo!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Lote</TableHead>
                  <TableHead>Data do Parto</TableHead>
                  <TableHead>Nascidos Vivos</TableHead>
                  <TableHead>Nascidos Mortos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotes.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell>{format(new Date(l.dataParto), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{l.nascidosVivos}</TableCell>
                    <TableCell>{l.nascidosMortos}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                        {l.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteLote(l.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Lote" : "Adicionar Novo Lote"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize as informações do lote." : "Preencha as informações do novo lote."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Lote</Label>
              <Input
                placeholder="Ex: Lote-001"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            {matrizes.length > 0 && (
              <div>
                <Label>Matriz</Label>
                <Select value={form.matrizId} onValueChange={(v) => setForm({ ...form, matrizId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a matriz" />
                  </SelectTrigger>
                  <SelectContent>
                    {matrizes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.identificador}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Data do Parto</Label>
              <Input
                type="date"
                value={form.dataParto}
                onChange={(e) => setForm({ ...form, dataParto: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nascidos Vivos</Label>
                <Input
                  type="number"
                  value={form.nascidosVivos}
                  onChange={(e) => setForm({ ...form, nascidosVivos: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Nascidos Mortos</Label>
                <Input
                  type="number"
                  value={form.nascidosMortos}
                  onChange={(e) => setForm({ ...form, nascidosMortos: Number(e.target.value) })}
                />
              </div>
            </div>
            {editing && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusLote })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Desmamado">Desmamado</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Salvar Lote"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
