import { cn } from "@/lib/utils";

/**
 * Logo do MatrizPro.
 * - "branca": para fundos escuros (menu lateral verde)
 * - "verde": para fundos claros (login, páginas internas)
 */
export function Logo({ variante = "branca", className }: { variante?: "branca" | "verde"; className?: string }) {
  return (
    <img
      src={variante === "branca" ? "/logo-branca.png" : "/logo-verde.png"}
      alt="MatrizPro"
      className={cn("h-8 w-8 shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
