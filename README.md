# MatrizPro

Sistema web para gestão de suinocultura: matrizes reprodutoras, ciclos reprodutivos, lotes (leitegadas), leitões, pesagens, saúde, vacinas e custos.

## Funcionalidades

- **Matrizes** — cadastro, status no plantel e ciclo reprodutivo completo (cobertura → parto → desmame). O parto previsto é calculado pela duração da gestação configurada, e registrar o parto cria o lote automaticamente.
- **Lotes** — leitões (cadastro individual ou rápido), pesagem individual ou do lote inteiro, GPD (ganho de peso diário), registros de saúde, agenda de vacinas e lançamentos financeiros (custos e receitas).
- **Painel** — indicadores, gráfico de GPD por lote e alertas automáticos: vacina próxima/atrasada, pesagem, desmame, parto previsto/atrasado, baixo peso, saúde crítica, mortalidade e natimortalidade.
- **Análise** — comparativo de desempenho entre lotes, curva de crescimento individual e custos x receitas.
- **Relatórios** — geral, por lote e financeiro, com geração de PDF (impressão do navegador) e exportação CSV.
- **Configurações** — dados da fazenda, parâmetros de manejo/alertas e backup/restauração em JSON.
- **Reprodutores** — cadastro dos cachaços com desempenho (coberturas, taxa de prenhez, média de nascidos vivos).
- **Assinatura** — 10 dias de teste grátis; depois plano **mensal (R$ 97,90)** ou **semestral (6 meses pelo preço de 5)**. Aviso de renovação 10 dias antes, na faixa do topo e na caixa de Mensagens. Liberação manual pela área **Assinantes** (só a administradora). O bloqueio é feito no banco (RLS).
- **Faturamento** — vendas de leitões (uma a uma ou em grupo, preço por kg ou por cabeça) e de descarte (matrizes e reprodutores), separadas, com período, gráfico mensal e desfazer venda.
- **Mensagens** — caixa de entrada só de leitura para os usuários; a administradora envia para todos ou para uma pessoa.
- **Suporte** — manual de uso em PDF (`npm run manual` gera a partir de `src/content/manual.json`), perguntas frequentes e botão de WhatsApp.

## Login (Supabase)

O acesso ao sistema exige login com email e senha, autenticado pelo Supabase. Os dados de cada usuário (matrizes, lotes, configurações) ficam salvos no banco do Supabase e são sincronizados automaticamente; cada usuário só enxerga os próprios dados (Row Level Security).

Projeto Supabase: `matrizpro` (região São Paulo). Configuração já aplicada:

- Credenciais públicas em [`src/lib/supabase.ts`](src/lib/supabase.ts) (Project URL + publishable key).
- Tabelas e políticas de segurança: [`supabase/migrations/001_esquema_inicial.sql`](supabase/migrations/001_esquema_inicial.sql) (já executado no SQL Editor).
- Reprodutores, assinaturas e funções de administração: [`supabase/migrations/002_reprodutores_e_assinaturas.sql`](supabase/migrations/002_reprodutores_e_assinaturas.sql) (já executado).
- Plano semestral e caixa de mensagens: [`supabase/migrations/003_planos_e_mensagens.sql`](supabase/migrations/003_planos_e_mensagens.sql) (já executado).
- Base de demonstração (50 leitões, uma situação de cada) da conta da Karen: [`supabase/seed/base_exemplo_karen.sql`](supabase/seed/base_exemplo_karen.sql) (já executado). Base grande para teste de desempenho: [`supabase/seed/base_grande_10mil.sql`](supabase/seed/base_grande_10mil.sql).
- Authentication → Email: **Confirm email** ativado; senha com mínimo de 8 caracteres, letras e números.
- Authentication → URL Configuration: Site URL `http://localhost:8080` e Redirect URL `http://localhost:8080/**`.

Ao publicar o app, adicione o endereço publicado em **Redirect URLs** (e troque o **Site URL**).

O serviço de email padrão do Supabase envia poucos emails por hora e só entrega para membros da equipe do projeto. Para cadastrar usuários reais, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

## Pendências

O que ainda falta definir (valor da mensalidade, WhatsApp, pagamento, SMTP...) está em [`PENDENCIAS.md`](PENDENCIAS.md).

## Armazenamento

Os dados ficam no Supabase (nuvem) e o navegador guarda uma cópia local para abrir mais rápido. **Configurações → Exportar backup** gera uma cópia extra em arquivo JSON.

## Desenvolvimento

Requer Node.js 18+.

```bash
npm install
npm run dev      # servidor de desenvolvimento em http://localhost:8080
npm test         # testes (Vitest)
npm run lint     # ESLint
npm run build    # build de produção em dist/
```

## Tecnologias

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, Zod, Recharts, date-fns.

## Estrutura

```
src/
  components/     componentes compartilhados (layout, diálogos de matriz/lote, shadcn/ui)
  lib/            datas (fuso local), validação, utilitários
  pages/          páginas (Painel, Matrizes, Lotes, Análise, Relatórios, Configurações)
  store/          estado global persistido (Zustand)
  types/          modelos de dados
  utils/          alertas e métricas (GPD, mortalidade, custos)
```
