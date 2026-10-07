import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Database, Download, Settings, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { CONFIG_PADRAO, normalizarDados, useStore } from "@/store/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/Campo";
import { useConfirm } from "@/components/ConfirmDialog";
import { hojeISO } from "@/lib/date";
import { ErrosFormulario, numero, validar } from "@/lib/validacao";

const inteiro = (min: number, max: number) =>
  z
    .number({ invalid_type_error: "Informe um número." })
    .int("Use um número inteiro.")
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`);

const schemaParametros = z.object({
  diasGestacao: inteiro(100, 130),
  diasDesmame: inteiro(14, 60),
  intervaloPesagemDias: inteiro(1, 30),
  antecedenciaVacinaDias: inteiro(0, 30),
  limiteBaixoPesoPercent: inteiro(5, 50),
  limiteMortalidadePercent: inteiro(1, 50),
});

type CamposParametros = keyof z.infer<typeof schemaParametros>;

const camposParametros: { campo: CamposParametros; label: string; ajuda: string }[] = [
  { campo: "diasGestacao", label: "Duração da gestação (dias)", ajuda: "Usado para prever a data do parto." },
  { campo: "diasDesmame", label: "Idade de desmame (dias)", ajuda: "Gera o alerta de desmame previsto." },
  { campo: "intervaloPesagemDias", label: "Intervalo entre pesagens (dias)", ajuda: "Frequência do lembrete de pesagem." },
  { campo: "antecedenciaVacinaDias", label: "Aviso de vacina (dias antes)", ajuda: "Com quantos dias de antecedência alertar." },
  { campo: "limiteBaixoPesoPercent", label: "Baixo ganho de peso (% abaixo da média)", ajuda: "Leitões com GPD abaixo da média do lote além deste percentual geram alerta." },
  { campo: "limiteMortalidadePercent", label: "Mortalidade alta (%)", ajuda: "Limite para o alerta de mortalidade do lote." },
];

export default function ConfiguracoesPage() {
  const { configuracoes, updateConfiguracoes, importarDados, resetarDados, matrizes, lotes } = useStore();
  const { confirmar, dialog } = useConfirm();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [fazenda, setFazenda] = useState({
    nomeFazenda: configuracoes.nomeFazenda,
    responsavel: configuracoes.responsavel,
    cidade: configuracoes.cidade,
  });
  const paraTexto = () =>
    Object.fromEntries(camposParametros.map(({ campo }) => [campo, String(configuracoes[campo])])) as Record<
      CamposParametros,
      string
    >;
  const [parametros, setParametros] = useState(paraTexto);
  const [erros, setErros] = useState<ErrosFormulario>({});

  // Atualiza os formulários quando os dados mudam (ex.: após importar um backup)
  useEffect(() => {
    setFazenda({ nomeFazenda: configuracoes.nomeFazenda, responsavel: configuracoes.responsavel, cidade: configuracoes.cidade });
    setParametros(paraTexto());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuracoes]);

  const salvarFazenda = () => {
    updateConfiguracoes({
      nomeFazenda: fazenda.nomeFazenda.trim(),
      responsavel: fazenda.responsavel.trim(),
      cidade: fazenda.cidade.trim(),
    });
    toast.success("Dados da fazenda salvos.");
  };

  const salvarParametros = () => {
    const r = validar(
      schemaParametros,
      Object.fromEntries(Object.entries(parametros).map(([k, v]) => [k, numero(v)]))
    );
    if (!r.ok) return setErros(r.erros);
    setErros({});
    updateConfiguracoes(r.dados);
    toast.success("Parâmetros atualizados.");
  };

  const exportar = () => {
    const dados = { app: "MatrizPro", versao: 2, exportadoEm: new Date().toISOString(), matrizes, lotes, configuracoes };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matrizpro-backup-${hojeISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado.");
  };

  const aoSelecionarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    try {
      const conteudo = JSON.parse(await arquivo.text());
      const dados = normalizarDados(conteudo);
      confirmar({
        titulo: "Restaurar backup?",
        descricao: `O arquivo contém ${dados.matrizes.length} matriz(es) e ${dados.lotes.length} lote(s). Todos os dados atuais serão substituídos.`,
        confirmar: "Restaurar",
        onConfirm: () => {
          importarDados(dados);
          toast.success("Backup restaurado com sucesso.");
        },
      });
    } catch (erro) {
      toast.error(erro instanceof Error && erro.message.startsWith("Arquivo") ? erro.message : "Não foi possível ler o arquivo de backup.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <Card className="max-w-3xl border border-border">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Dados da Fazenda</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nome da fazenda/granja">
              <Input value={fazenda.nomeFazenda} onChange={(e) => setFazenda({ ...fazenda, nomeFazenda: e.target.value })} />
            </Campo>
            <Campo label="Responsável">
              <Input value={fazenda.responsavel} onChange={(e) => setFazenda({ ...fazenda, responsavel: e.target.value })} />
            </Campo>
            <Campo label="Cidade / UF">
              <Input value={fazenda.cidade} onChange={(e) => setFazenda({ ...fazenda, cidade: e.target.value })} />
            </Campo>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvarFazenda}>Salvar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl border border-border">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Parâmetros de Manejo e Alertas</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {camposParametros.map(({ campo, label, ajuda }) => (
              <Campo key={campo} label={label} erro={erros[campo]} ajuda={ajuda}>
                <Input
                  type="number"
                  value={parametros[campo]}
                  onChange={(e) => setParametros({ ...parametros, [campo]: e.target.value })}
                />
              </Campo>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setParametros(
                  Object.fromEntries(camposParametros.map(({ campo }) => [campo, String(CONFIG_PADRAO[campo])])) as Record<
                    CamposParametros,
                    string
                  >
                );
                setErros({});
              }}
            >
              Restaurar padrões
            </Button>
            <Button onClick={salvarParametros}>Salvar parâmetros</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl border border-border">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Backup dos Dados</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Os dados ficam salvos apenas neste navegador. Exporte um backup regularmente para não perder informações
            ao limpar o navegador ou trocar de computador.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={exportar}>
              <Download className="h-4 w-4" /> Exportar backup
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => inputArquivo.current?.click()}>
              <Upload className="h-4 w-4" /> Restaurar backup
            </Button>
            <input ref={inputArquivo} type="file" accept="application/json,.json" className="hidden" onChange={aoSelecionarArquivo} />
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() =>
                confirmar({
                  titulo: "Apagar todos os dados?",
                  descricao: "Todas as matrizes, lotes, leitões e configurações serão apagados deste navegador. Exporte um backup antes, se precisar.",
                  confirmar: "Apagar tudo",
                  onConfirm: () => {
                    resetarDados();
                    toast.success("Dados apagados.");
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" /> Apagar todos os dados
            </Button>
          </div>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
