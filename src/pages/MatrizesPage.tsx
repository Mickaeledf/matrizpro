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
import { Matriz, StatusReprodutivo } from "@/types";
import { format } from "date-fns";

export default function MatrizesPage() {
  const { matrizes, addMatriz, updateMatriz, deleteMatriz } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Matriz | null>(null);
  const [form, setForm] = useState({
    identificador: "",
    dataNascimento: format(new Date(), "yyyy-MM-dd"),
    dataEntrada: format(new Date(), "yyyy-MM-dd"),
    precoAquisicao: 0,
    statusReprodutivo: "Vazia" as StatusReprodutivo,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      identificador: "",
      dataNascimento: format(new Date(), "yyyy-MM-dd"),
      dataEntrada: format(new Date(), "yyyy-MM-dd"),
      precoAquisicao: 0,
      statusReprodutivo: "Vazia",
    });
    setOpen(true);
  };

  const openEdit = (m: Matriz) => {
    setEditing(m);
    setForm({
      identificador: m.identificador,
      dataNascimento: m.dataNascimento,
      dataEntrada: m.dataEntrada,
      precoAquisicao: m.precoAquisicao,
      statusReprodutivo: m.statusReprodutivo,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.identificador) return;
    if (editing) {
      updateMatriz(editing.id, form);
    } else {
      addMatriz({ ...form, status: "Ativa" });
    }
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-6">Matrizes</h1>

      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Todas as Matrizes</h2>
              <p className="text-sm text-muted-foreground">Gerencie e acompanhe todas as suas matrizes reprodutoras.</p>
            </div>
            <Button onClick={openNew} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Adicionar Nova Matriz
            </Button>
          </div>

          {matrizes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-primary">Nenhuma matriz encontrada. Comece adicionando uma nova!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Data de Entrada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status Reprodutivo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrizes.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.identificador}</TableCell>
                    <TableCell>{format(new Date(m.dataEntrada), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                        {m.status}
                      </span>
                    </TableCell>
                    <TableCell>{m.statusReprodutivo}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMatriz(m.id)}>
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
            <DialogTitle>{editing ? "Editar Matriz" : "Adicionar Nova Matriz"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize as informações da matriz."
                : "Preencha as informações para cadastrar uma nova matriz reprodutora."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Identificador (Brinco/Tatuagem)</Label>
              <Input
                placeholder="Ex: M-042"
                value={form.identificador}
                onChange={(e) => setForm({ ...form, identificador: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={form.dataNascimento}
                onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Entrada no Plantel</Label>
              <Input
                type="date"
                value={form.dataEntrada}
                onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })}
              />
            </div>
            <div>
              <Label>Preço de Aquisição (R$)</Label>
              <Input
                type="number"
                value={form.precoAquisicao}
                onChange={(e) => setForm({ ...form, precoAquisicao: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">Custo de compra da matriz.</p>
            </div>
            <div>
              <Label>Status Reprodutivo Inicial</Label>
              <Select
                value={form.statusReprodutivo}
                onValueChange={(v) => setForm({ ...form, statusReprodutivo: v as StatusReprodutivo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vazia">Vazia</SelectItem>
                  <SelectItem value="Gestante">Gestante</SelectItem>
                  <SelectItem value="Lactante">Lactante</SelectItem>
                  <SelectItem value="Desmamada">Desmamada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Salvar Matriz"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
