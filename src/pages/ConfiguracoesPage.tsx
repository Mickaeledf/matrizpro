import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Database, Download, FlaskConical, KeyRound, Settings, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { FormNovaSenha } from "@/components/FormNovaSenha";
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
  const { configuracoes, updateConfiguracoes, importarDados, resetarDados, removerDadosExemplo, matrizes, reprodutores, lotes } =
    useStore();
  const { user, definirNovaSenha } = useAuth();
  const exemplos = {
    matrizes: matrizes.filter((m) => m.origem === "exemplo").length,
    reprodutores: reprodutores.filter((r) => r.origem === "exemplo").length,
    lotes: lotes.filter((l) => l.origem === "exemplo").length,
  };
  const temExemplos = exemplos.matrizes + exemplos.reprodutores + exemplos.lotes > 0;
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
    const dados = { app: "MatrizPro", versao: 3, exportadoEm: new Date().toISOString(), matrizes, reprodutores, lotes, configuracoes };
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
            Seus dados ficam salvos na nuvem (Supabase) e aparecem em qualquer computador ao entrar com sua conta.
            O backup em arquivo é uma cópia extra para guardar com você.
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
                  descricao: "Todas as matrizes, lotes, leitões e configurações da sua conta serão apagados, inclusive da nuvem. Exporte um backup antes, se precisar.",
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
      <Card className="max-w-3xl border border-border">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Alterar senha</h2>
          </div>
          <p className="text-sm text-muted-foreground">Conta: {user?.email}</p>
          <div className="max-w-sm">
            <FormNovaSenha
              rotuloBotao="Alterar senha"
              onSalvar={async (senha) => {
                const erro = await definirNovaSenha(senha);
                if (!erro) toast.success("Senha alterada com sucesso.");
                return erro;
              }}
            />
          </div>
        </CardContent>
      </Card>

      {temExemplos && (
        <Card className="max-w-3xl border border-border">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Dados de Exemplo</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Sua conta tem uma base de demonstração ({exemplos.matrizes} matrizes, {exemplos.reprodutores} reprodutores e{" "}
              {exemplos.lotes} lotes) para você explorar o sistema. Quando quiser começar com os seus dados reais, remova
              somente esses registros. O que você cadastrou não é afetado.
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                confirmar({
                  titulo: "Remover os dados de exemplo?",
                  descricao: "Somente os registros de demonstração serão apagados (inclusive da nuvem). Esta ação não pode ser desfeita.",
                  confirmar: "Remover exemplos",
                  onConfirm: () => {
                    removerDadosExemplo();
                    toast.success("Dados de exemplo removidos.");
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" /> Remover dados de exemplo
            </Button>
          </CardContent>
        </Card>
      )}
      {dialog}
    </div>
  );
}
