# 📝 Bloco de notas — o que a Karen ainda vai definir

Lista do que ficou **em aberto** no MatrizPro. Quando decidir um item, é só preencher e marcar com `[x]`.
Quase tudo se altera num único arquivo: **`src/config/negocio.ts`**.

---

## 💰 Assinatura

- [x] **Plano mensal:** R$ 97,90 (30 dias).
- [ ] **Plano semestral — CONFIRMAR o cálculo:** hoje está **R$ 489,50 por 6 meses** (paga 5 mensalidades, ganha 1 mês grátis).
  Se a ideia for outra (ex.: pagar 6 meses = R$ 587,40 e ganhar o 7º mês), avise para ajustar.
  → valores em `src/config/negocio.ts`, objeto `PLANOS`.

- [ ] **Forma de pagamento** (escolher uma): ☐ Mercado Pago ☐ Asaas ☐ Stripe ☐ PIX manual ☐ outra: ________
  → criar **dois links** (mensal e semestral) e colar em `linksPagamento.mensal` e `linksPagamento.semestral` no mesmo arquivo.
  Enquanto vazios, os botões mostram "Pagamento online em breve".
  → **Hoje a liberação é manual:** quando o cliente pagar, entre em **Assinantes** e clique em **"Pagou mensal"** (+30 dias) ou **"Pagou semestral"** (+180 dias).
  → Próximo passo (opcional): ligar o pagamento automático (o gateway avisa o sistema e libera sozinho).

- [x] **Aviso de renovação:** 10 dias antes de vencer, na faixa do topo **e** na caixa de Mensagens, com os links dos dois planos (`diasAvisoRenovacao` em `src/config/negocio.ts`).
- [x] **Caixa de mensagens:** só a administradora (Karen) envia, em **Mensagens → Enviar mensagem** (para todos ou para uma pessoa); os usuários só leem.

- [ ] **Teste grátis:** está em **10 dias**. Se quiser mudar, ajuste nos dois lugares:
  `diasTeste` em `src/config/negocio.ts` **e** o `interval '10 days'` em `supabase/migrations/002_reprodutores_e_assinaturas.sql` (rodar de novo no SQL Editor do Supabase).

- [ ] **Quando a assinatura vence:** hoje o cliente **vê a tela de assinatura** e **não consegue gravar** nada, mas os dados ficam guardados. Confirmar se é isso mesmo ou se prefere outra regra (ex.: só leitura por X dias, apagar após X meses).

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
- [ ] **Domínio / endereço do site** (ex.: app.matrizpro.com.br) e **onde publicar** (Vercel, Netlify, Lovable).
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
