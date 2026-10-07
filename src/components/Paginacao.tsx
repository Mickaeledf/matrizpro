import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Divide uma lista em páginas. Volta para a página 1 quando a lista muda de tamanho (ex.: filtro). */
export function usePaginacao<T>(itens: T[], porPagina = 50) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));

  useEffect(() => {
    setPagina(1);
  }, [itens.length]);

  const pagina1 = Math.min(pagina, totalPaginas);
  const visiveis = useMemo(
    () => itens.slice((pagina1 - 1) * porPagina, pagina1 * porPagina),
    [itens, pagina1, porPagina]
  );

  return { visiveis, pagina: pagina1, totalPaginas, setPagina, total: itens.length, porPagina };
}

export function Paginacao({
  pagina,
  totalPaginas,
  total,
  porPagina,
  setPagina,
}: {
  pagina: number;
  totalPaginas: number;
  total: number;
  porPagina: number;
  setPagina: (p: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground print:hidden">
      <span>
        {inicio}–{fim} de {total.toLocaleString("pt-BR")}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
