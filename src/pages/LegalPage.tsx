import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CONTATO_EMAIL, DocumentoLegal, POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO, VERSAO_TERMOS } from "@/content/legal";

const DOCUMENTOS: Record<"termos" | "privacidade", DocumentoLegal> = {
  termos: TERMOS_DE_USO,
  privacidade: POLITICA_DE_PRIVACIDADE,
};

const dataVersao = VERSAO_TERMOS.split("-").reverse().join("/");

/** Páginas públicas /termos e /privacidade (abrem sem login). */
export default function LegalPage({ tipo }: { tipo: "termos" | "privacidade" }) {
  const doc = DOCUMENTOS[tipo];
  const outro = tipo === "termos" ? { rota: "/privacidade", nome: "Política de Privacidade" } : { rota: "/termos", nome: "Termos de Uso" };

  useEffect(() => {
    document.title = `${doc.titulo} — MatrizPro`;
    window.scrollTo(0, 0);
    return () => {
      document.title = "MatrizPro — Gestão de Matrizes e Leitões";
    };
  }, [doc.titulo]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <a href="/inicio" className="flex items-center gap-2 text-primary">
            <Logo variante="verde" className="h-9 w-9" />
            <span className="text-lg font-bold">MatrizPro</span>
          </a>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/login">
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground">{doc.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Versão de {dataVersao}</p>
        <p className="mt-4 text-base text-foreground/90">{doc.resumo}</p>

        <div className="mt-8 space-y-7">
          {doc.secoes.map((s) => (
            <section key={s.titulo}>
              <h2 className="text-lg font-bold text-foreground">{s.titulo}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">
                {s.paragrafos.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <a href={`mailto:${CONTATO_EMAIL}`} className="flex items-center gap-2 text-primary hover:underline">
            <Mail className="h-4 w-4" /> {CONTATO_EMAIL}
          </a>
          <Link to={outro.rota} className="text-primary hover:underline">
            Ler a {outro.nome} →
          </Link>
        </div>
      </main>
    </div>
  );
}
