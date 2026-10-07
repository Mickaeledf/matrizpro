import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Baby, Heart, Pencil, PlusCircle, Trash2, XCircle, Milk } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useConfirm } from "@/components/ConfirmDialog";
import { MatrizFormDialog } from "@/components/matriz/MatrizFormDialog";
import { CoberturaDialog, DesmameDialog, PartoDialog } from "@/components/matriz/CicloDialogs";
import { CicloReprodutivo } from "@/types";
import { diasEntre, formatarData, formatarMoeda, formatarNumero } from "@/lib/date";

export default function MatrizDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matrizes, lotes, registrarFalhaGestacao, deleteCiclo } = useStore();
  const { confirmar, dialog } = useConfirm();
  const matriz = matrizes.find((m) => m.id === id);

  const [editar, setEditar] = useState(false);
  const [cobertura, setCobertura] = useState(false);
  const [partoCiclo, setPartoCiclo] = useState<CicloReprodutivo | null>(null);
  const [desmameCiclo, setDesmameCiclo] = useState<CicloReprodutivo | null>(null);

  const lotesDaMatriz = useMemo(() => lotes.filter((l) => l.matrizId === id), [lotes, id]);

  const indicadores = useMemo(() => {
    if (!matriz) return null;
    const partos = matriz.ciclos.filter((c) => c.dataParto).sort((a, b) => a.dataParto!.localeCompare(b.dataParto!));
    const intervalos = partos.slice(1).map((c, i) => diasEntre(partos[i].dataParto, c.dataParto!));
    const leitegadas = lotesDaMatriz;
    return {
      partos: partos.length,
      mediaVivos:
        leitegadas.length > 0 ? leitegadas.reduce((a, l) => a + l.nascidosVivos, 0) / leitegadas.length : null,
      intervaloMedio: intervalos.length > 0 ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length : null,
      falhas: matriz.ciclos.filter((c) => c.status === "Falhou").length,
    };
  }, [matriz, lotesDaMatriz]);

  if (!matriz || !indicadores) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">Matriz não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/matrizes")}>
          Voltar para Matrizes
        </Button>
      </div>
    );
  }

  const cicloAberto = matriz.ciclos.some((c) => c.status === "Em gestação" || c.status === "Parida");
  const ciclos = [...matriz.ciclos].sort((a, b) => b.dataCobertura.localeCompare(a.dataCobertura));

  const kpis = [
    { label: "Partos", valor: String(indicadores.partos) },
    {
      label: "Média de Nascidos Vivos",
      valor: indicadores.mediaVivos !== null ? formatarNumero(indicadores.mediaVivos) : "—",
    },
    {
      label: "Intervalo Médio entre Partos",
      valor: indicadores.intervaloMedio !== null ? `${Math.round(indicadores.intervaloMedio)} dias` : "—",
    },
    { label: "Falhas de Gestação", valor: String(indicadores.falhas) },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/matrizes")} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Matriz {matriz.identificador}</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={matriz.status} />
              <StatusBadge status={matriz.statusReprodutivo} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            className="gap-2"
            onClick={() => setCobertura(true)}
            disabled={cicloAberto || matriz.status !== "Ativa"}
            title={cicloAberto ? "Finalize o ciclo atual antes de registrar nova cobertura." : undefined}
          >
            <PlusCircle className="h-4 w-4" />
            Registrar Cobertura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{k.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-border">
        <CardContent className="grid gap-4 p-4 text-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Nascimento</p>
            <p className="font-medium">{formatarData(matriz.dataNascimento)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entrada no plantel</p>
            <p className="font-medium">{formatarData(matriz.dataEntrada)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Preço de aquisição</p>
            <p className="font-medium">{formatarMoeda(matriz.precoAquisicao)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Idade</p>
            <p className="font-medium">{Math.floor(diasEntre(matriz.dataNascimento) / 30)} meses</p>
          </div>
          {matriz.observacoes && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-muted-foreground">Observações</p>
              <p className="whitespace-pre-line">{matriz.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-foreground">Ciclos Reprodutivos</h2>
          <p className="mb-4 text-sm text-muted-foreground">Cobertura → parto → desmame. O status da matriz é atualizado automaticamente.</p>
          {ciclos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum ciclo registrado. Use "Registrar Cobertura" para iniciar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parto Previsto</TableHead>
                  <TableHead>Parto</TableHead>
                  <TableHead>Desmame</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ciclos.map((c) => {
                  const lote = lotes.find((l) => l.id === c.loteId);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{formatarData(c.dataCobertura)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {c.tipoCobertura}
                        {c.reprodutor &&
                          (c.reprodutorId ? (
                            <Link to="/reprodutores" className="block text-xs text-primary underline-offset-2 hover:underline">
                              {c.reprodutor}
                            </Link>
                          ) : (
                            <span className="block text-xs text-muted-foreground">{c.reprodutor}</span>
                          ))}
                      </TableCell>
                      <TableCell>{formatarData(c.dataPrevistaParto)}</TableCell>
                      <TableCell>{formatarData(c.dataParto)}</TableCell>
                      <TableCell>{formatarData(c.dataDesmame)}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell>
                        {lote ? (
                          <Link to={`/lotes/${lote.id}`} className="text-primary underline-offset-2 hover:underline">
                            {lote.nome}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.status === "Em gestação" && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => setPartoCiclo(c)}>
                                <Baby className="h-4 w-4" /> Parto
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1"
                                onClick={() =>
                                  confirmar({
                                    titulo: "Registrar falha de gestação?",
                                    descricao: "A matriz voltará ao status \"Vazia\".",
                                    confirmar: "Registrar falha",
                                    onConfirm: () => registrarFalhaGestacao(matriz.id, c.id),
                                  })
                                }
                              >
                                <XCircle className="h-4 w-4" /> Falhou
                              </Button>
                            </>
                          )}
                          {c.status === "Parida" && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setDesmameCiclo(c)}>
                              <Milk className="h-4 w-4" /> Desmame
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir ciclo"
                            onClick={() =>
                              confirmar({
                                titulo: "Excluir este ciclo?",
                                descricao: "O registro do ciclo será removido. O lote vinculado (se houver) não é excluído.",
                                onConfirm: () => deleteCiclo(matriz.id, c.id),
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

      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Leitegadas</h2>
          </div>
          {lotesDaMatriz.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lote vinculado a esta matriz.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Parto</TableHead>
                  <TableHead>Vivos</TableHead>
                  <TableHead>Mortos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesDaMatriz.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/lotes/${l.id}`)}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell>{formatarData(l.dataParto)}</TableCell>
                    <TableCell>{l.nascidosVivos}</TableCell>
                    <TableCell>{l.nascidosMortos}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MatrizFormDialog open={editar} onOpenChange={setEditar} matriz={matriz} />
      <CoberturaDialog open={cobertura} onOpenChange={setCobertura} matriz={matriz} />
      <PartoDialog
        open={!!partoCiclo}
        onOpenChange={(o) => !o && setPartoCiclo(null)}
        matriz={matriz}
        ciclo={partoCiclo}
        onSaved={(loteId) => navigate(`/lotes/${loteId}`)}
      />
      <DesmameDialog
        open={!!desmameCiclo}
        onOpenChange={(o) => !o && setDesmameCiclo(null)}
        matriz={matriz}
        ciclo={desmameCiclo}
      />
      {dialog}
    </div>
  );
}
