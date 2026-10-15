# 📝 Bloco de notas — o que a Karen ainda vai definir

Lista do que ficou **em aberto** no MatrizPro. Quando decidir um item, é só preencher e marcar com `[x]`.
Quase tudo se altera num único arquivo: **`src/config/negocio.ts`**.

---

## 💰 Assinatura

- [x] **Plano mensal:** R$ 97,90 (30 dias).
- [ ] **Plano semestral — CONFIRMAR o cálculo:** hoje está **R$ 489,50 por 6 meses** (paga 5 mensalidades, ganha 1 mês grátis).
  Se a ideia for outra (ex.: pagar 6 meses = R$ 587,40 e ganhar o 7º mês), avise para ajustar.
  → valores em `src/config/negocio.ts`, objeto `PLANOS`.

- [x] **Forma de pagamento: Mercado Pago** (PIX, cartão e boleto), com **liberação automática**.
  O servidor (Edge Function `pagamentos`) confere cada pagamento direto no Mercado Pago — status aprovado e valor certo do plano — antes de liberar.
  Os pagamentos aparecem em **Assinantes → Pagamentos online**. Os botões "Pagou mensal/semestral" continuam para pagamentos por fora (PIX direto etc.).
- [ ] **⚠️ PARA LIGAR O PAGAMENTO — falta só você (3 passos, ~10 min):**
  1. Supabase → Edge Functions → **pagamentos** → aba **Settings** → desligar **"Verify JWT with legacy secret"** → **Save changes**.
  2. Mercado Pago → **Suas integrações** (mercadopago.com.br/developers/panel/app) → **Criar aplicação** ("Pagamentos online", produto **Checkout Pro**) → **Credenciais de produção** → copiar o **Access Token** (começa com `APP_USR-`).
  3. Supabase → Edge Functions → **Secrets** → **Add new secret**: nome `MP_ACCESS_TOKEN`, valor = o Access Token. **Não mande esse código para ninguém** (nem para mim): ele dá acesso à sua conta do Mercado Pago.
  Opcional (mais segurança): no Mercado Pago, em **Webhooks**, cadastrar a URL `https://txcglwflynguuazsjuya.supabase.co/functions/v1/pagamentos` com o evento **Pagamentos**, e colar a "assinatura secreta" no secret `MP_WEBHOOK_SECRET`.
  Enquanto o token não estiver lá, o botão "Assinar" mostra "O pagamento online ainda não foi ativado".

- [x] **Aviso de renovação:** 10 dias antes de vencer, na faixa do topo **e** na caixa de Mensagens, com os links dos dois planos (`diasAvisoRenovacao` em `src/config/negocio.ts`).
- [x] **Caixa de mensagens:** só a administradora (Karen) envia, em **Mensagens → Enviar mensagem** (para todos ou para uma pessoa); os usuários só leem.

- [x] **Teste grátis: 7 dias, só com as abas básicas** (Painel, Matrizes, Lotes, Mensagens, Suporte, Configurações). Reprodutores, Faturamento, Análise e Relatórios aparecem com cadeado.
  Para mudar: `diasTeste` e `ABAS_PLANO_PAGO` em `src/config/negocio.ts` **e** o `interval '7 days'` em `supabase/migrations/004_teste_7_dias_e_pagamentos.sql`.

- [x] **Quando o teste ou o plano vence:** o cliente vê **só a página Assinatura** (para pagar) e o banco bloqueia gravações. Os dados ficam guardados e voltam assim que o pagamento é confirmado.

## 📞 Suporte

- [ ] **Número do WhatsApp do suporte:** (__) _____-_____
  → em `src/config/negocio.ts`, campo `whatsappSuporte`, **só números com 55 + DDD** (ex.: `"5562999998888"`).
  Enquanto estiver vazio, o botão aparece como "Número em breve".

- [ ] **Mensagem automática do WhatsApp:** hoje é "Olá! Preciso de ajuda com o MatrizPro." (campo `mensagemWhatsapp`).

- [ ] **Manual de uso (PDF):** já existe uma primeira versão em `public/manual-matrizpro.pdf`.
  Revisar o texto em `src/content/manual.json` e gerar o PDF de novo com o comando `npm run manual`.
  (Se preferir fazer um PDF próprio, com fotos, basta substituir o arquivo `public/manual-matrizpro.pdf`.)

## 📧 Emails e domínio

- [ ] **SMTP próprio para os emails de confirmação.** O serviço gratuito do Supabase **só entrega para membros da equipe do projeto** e envia poucos emails por hora → clientes reais **não vão receber** o email de confirmação até isso ser configurado.
  Opções: Resend, Brevo, Amazon SES, Gmail (Workspace). Configurar em Supabase → Authentication → Emails → SMTP Settings.
- [ ] **Remetente e texto dos emails** (nome "MatrizPro", logo, português) em Supabase → Authentication → Emails → Templates.
- [ ] **Email "Redefinir senha" em português:** o botão "Esqueci minha senha" já funciona, mas o email chega com o texto padrão em inglês do Supabase. Traduzir em Authentication → Emails → Templates → *Reset Password*. Ao publicar o site, o endereço novo precisa estar em **Redirect URLs** (senão o link de nova senha não abre).
- [x] **Site no ar: https://matrizpro.vercel.app** (Vercel, grátis). A cada `git push` o site atualiza sozinho. Supabase já configurado (Site URL + Redirect URLs).
- [ ] **Domínio próprio** (ex.: `matrizpro.com.br`): registrar no **Registro.br** (~R$ 40/ano) e, na Vercel, **Settings → Domains → Add** — ela mostra os 2 registros para copiar no Registro.br. Depois, repetir o passo 4 acima com o domínio novo.
  Depois de publicar, adicionar o endereço em Supabase → Authentication → URL Configuration (Site URL e Redirect URLs).

## 📄 Jurídico / marca

- [ ] Termos de uso e política de privacidade (LGPD) — exigidos para cobrar assinatura.
- [x] Logo: aplicada no menu, login, relatórios, manual em PDF e ícone do navegador (arquivos em `public/logo-*.png`).
- [ ] Cores definitivas (hoje: verde do MatrizPro).
- [ ] Nome da empresa/CNPJ para aparecer nos relatórios e recibos.

## 🧪 Dados de exemplo

- A sua conta tem uma **base de demonstração com 50 leitões**, montada para mostrar cada situação do sistema (todos os tipos de alerta, todos os status de matriz, leitão doente, vacina atrasada, lote vendido...). As datas são relativas ao dia em que o script roda.
- Quando quiser começar com dados reais: **Configurações → Remover dados de exemplo** (apaga só a demonstração).
- Para recriar a base (com as datas atualizadas para hoje): rodar `supabase/seed/base_exemplo_karen.sql` no SQL Editor do Supabase.
- Existe também `supabase/seed/base_grande_10mil.sql` (10.000 leitões), só para testar desempenho.

## 🧹 Outros

- [ ] **Migrar o Tailwind CSS 3 → 4** (fecha os 8 alertas de segurança restantes do `npm audit`). São alertas só da ferramenta de build do CSS, não afetam quem usa o site — mas a migração reescreve a configuração de estilos e precisa de revisão visual de todas as telas.
- [ ] A senha do banco de dados (gerada pelo Supabase) não foi anotada — se algum dia precisar, redefinir em Supabase → Project Settings → Database.
- [ ] Desativar o tradutor automático do Chrome no site do Supabase (ele trava o painel).

---

### Onde fica cada coisa

| O quê | Arquivo |
|---|---|
| Planos (mensal/semestral), WhatsApp, links de pagamento, dias de teste e de aviso | `src/config/negocio.ts` |
| Texto do manual / perguntas frequentes | `src/content/manual.json` → `npm run manual` |
| Regras do banco (teste, bloqueio, admin) | `supabase/migrations/002_reprodutores_e_assinaturas.sql` |
| Plano semestral e caixa de mensagens | `supabase/migrations/003_planos_e_mensagens.sql` |
| Base de exemplo | `supabase/seed/base_exemplo_karen.sql` |
| Endereço e chave pública do Supabase | `src/lib/supabase.ts` |
