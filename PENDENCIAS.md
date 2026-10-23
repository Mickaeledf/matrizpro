# 📝 Bloco de notas — o que a Karen ainda vai definir

Lista do que ficou **em aberto** no MatrizPro. Quando decidir um item, é só preencher e marcar com `[x]`.
Quase tudo se altera num único arquivo: **`src/config/negocio.ts`**.

---

## 🚦 ANTES DE VENDER (checklist)

- [x] Cada cadastro só vê e mexe nos próprios dados — testado no banco real (18/18). Para repetir o teste: colar `supabase/testes/teste_isolamento.sql` no SQL Editor e rodar (não grava nada; o resultado aparece como "erro" com o relatório).
- [x] Alterações feitas sem internet ficam guardadas no aparelho e sobem quando a internet volta; aviso ao fechar/sair com algo não enviado.
- [ ] **🔴 Email próprio (SMTP) — OBRIGATÓRIO para vender.** O email grátis do Supabase só entrega para a equipe do projeto: clientes **não recebem** o email de confirmação e **não conseguem entrar** (já aconteceu: cadastro de 15/10 nunca confirmado).
  Escolhido: **Gmail** (`social.mediacreative.br@gmail.com`, até 500 emails/dia; Resend exige domínio próprio). Já preenchido no Supabase (Authentication → Emails → SMTP Settings): remetente, nome "MatrizPro", `smtp.gmail.com`, porta 465, usuário. **Falta a Karen:**
  1. Entrar no Google com `social.mediacreative.br@gmail.com` → ativar a **Verificação em duas etapas** → abrir **myaccount.google.com/apppasswords** → criar a senha de app "MatrizPro" → copiar o código de 16 letras.
  2. Colar no campo **Password** do SMTP no Supabase → **Save changes**. (Não mandar o código para ninguém.)
  3. Avisar o Claude: ele coloca os emails em português (modelos prontos em `supabase/emails/`).
- [x] **Termos de Uso e Política de Privacidade** publicados em `/termos` e `/privacidade`, com "Li e aceito" obrigatório no cadastro (a versão aceita fica gravada na conta). Texto em `src/content/legal.ts` — modelo inicial, ideal revisar com advogado(a).
- [ ] **Anti-robô (Cloudflare Turnstile)** — widget "MatrizPro" criado (site key `0x4AAAAAAFh4vCaWjP8zzYg6`, domínios matrizpro.vercel.app, localhost, 127.0.0.1) e já no código (`src/components/Captcha.tsx`). **Ordem obrigatória:**
  1. Publicar o site com o código novo (git push).
  2. **Só depois:** Supabase → Authentication → **Attack Protection** → Enable Captcha → **Turnstile** → colar a **Secret Key** (Cloudflare → Turnstile → MatrizPro → Settings; secreta, não mandar para ninguém) → Save.
  ⚠️ Se ligar no Supabase antes do passo 1, ninguém consegue entrar.
- [ ] **Supabase Pro (US$ 25/mês)** quando entrar o primeiro cliente pagante: backup diário automático e o projeto **não "dorme"** (no plano grátis ele pausa após 7 dias sem uso e não tem backup).
- [ ] **Proteção contra senhas vazadas** e **CAPTCHA** no cadastro (Authentication → Attack Protection) — evita robôs criando contas.
- [ ] Testar a conexão da SyncPay (Assinantes → "Testar conexão com a SyncPay") e fazer **um PIX real de R$ 97,90** com um CPF seu para ver a liberação automática de ponta a ponta.
- [ ] **Teste de 2 pessoas** (manual, 10 min): criar 2 contas com emails diferentes, cadastrar 1 matriz em cada, entrar e sair no mesmo navegador e no celular, e conferir que uma nunca vê a da outra.
- [x] Termos de uso e política de privacidade (LGPD) publicados e com link no cadastro (ver acima).

---

## 💰 Assinatura

- [x] **Plano mensal:** R$ 97,90 (30 dias).
- [ ] **Plano semestral — CONFIRMAR o cálculo:** hoje está **R$ 489,50 por 6 meses** (paga 5 mensalidades, ganha 1 mês grátis).
  Se a ideia for outra (ex.: pagar 6 meses = R$ 587,40 e ganhar o 7º mês), avise para ajustar.
  → valores em `src/config/negocio.ts`, objeto `PLANOS`.

- [x] **Forma de pagamento: SyncPay (PIX)**, com **liberação automática**.
  O cliente informa nome, CPF e celular (exigidos pela SyncPay), o app mostra o QR Code / PIX Copia e Cola e confere sozinho até o PIX cair.
  O servidor (Edge Function `pagamentos`) consulta a cobrança direto na SyncPay — status "completed" e valor certo do plano — antes de liberar.
  Os pagamentos aparecem em **Assinantes → Pagamentos online**. Os botões "Pagou mensal/semestral" continuam para pagamentos por fora.
  (Cartão de crédito pela SyncPay exige tela de cartão própria — dá para adicionar depois, se quiser.)
- [ ] **⚠️ PARA LIGAR O PAGAMENTO — falta só você (3 passos):**
  1. Supabase → Edge Functions → **pagamentos** → aba **Settings** → desligar **"Verify JWT with legacy secret"** → **Save changes**.
  2. Painel da SyncPay → área de **API / credenciais** → gerar o par **client_id** e **client_secret** (o secret só aparece uma vez). A conta precisa estar **aprovada** na SyncPay.
  3. Supabase → Edge Functions → **Secrets** → **Add new secret** duas vezes: `SYNCPAY_CLIENT_ID` = client_id e `SYNCPAY_CLIENT_SECRET` = client_secret. **Não mande esses códigos para ninguém** (nem para mim): eles dão acesso à sua conta da SyncPay.
  Não precisa cadastrar webhook no painel: cada PIX já avisa o MatrizPro sozinho.
  Enquanto as credenciais não estiverem lá, o botão "Gerar PIX" mostra "O pagamento online ainda não foi ativado".

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

- [x] Termos de uso e política de privacidade (LGPD) — em `/termos` e `/privacidade`.
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
