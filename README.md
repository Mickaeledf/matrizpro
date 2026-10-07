# MatrizPro

Sistema web para gestão de suinocultura: matrizes reprodutoras, ciclos reprodutivos, lotes (leitegadas), leitões, pesagens, saúde, vacinas e custos.

## Funcionalidades

- **Matrizes** — cadastro, status no plantel e ciclo reprodutivo completo (cobertura → parto → desmame). O parto previsto é calculado pela duração da gestação configurada, e registrar o parto cria o lote automaticamente.
- **Lotes** — leitões (cadastro individual ou rápido), pesagem individual ou do lote inteiro, GPD (ganho de peso diário), registros de saúde, agenda de vacinas e lançamentos financeiros (custos e receitas).
- **Painel** — indicadores, gráfico de GPD por lote e alertas automáticos: vacina próxima/atrasada, pesagem, desmame, parto previsto/atrasado, baixo peso, saúde crítica, mortalidade e natimortalidade.
- **Análise** — comparativo de desempenho entre lotes, curva de crescimento individual e custos x receitas.
- **Relatórios** — geral, por lote e financeiro, com geração de PDF (impressão do navegador) e exportação CSV.
- **Configurações** — dados da fazenda, parâmetros de manejo/alertas e backup/restauração em JSON.

## Armazenamento

Os dados ficam no `localStorage` do navegador (chave `matrizpro-storage`, com versionamento e migração automática). Use **Configurações → Exportar backup** regularmente.

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
