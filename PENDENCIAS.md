# 📝 Bloco de notas — o que a Karen ainda vai definir

Lista do que ficou **em aberto** no MatrizPro. Quando decidir um item, é só preencher e marcar com `[x]`.
Quase tudo se altera num único arquivo: **`src/config/negocio.ts`**.

---

## 💰 Assinatura

- [ ] **Valor da mensalidade:** R$ ________
  → em `src/config/negocio.ts`, campo `valorMensalidade` (ex.: `valorMensalidade: 49.9,`).
  Enquanto estiver vazio, o sistema mostra "valor a definir".

- [ ] **Forma de pagamento** (escolher uma): ☐ Mercado Pago ☐ Asaas ☐ Stripe ☐ PIX manual ☐ outra: ________
  → depois de criar o link de pagamento, colar em `linkPagamento` no mesmo arquivo.
  → **Hoje a liberação é manual:** quando o cliente pagar, entre em **Assinantes** e clique em **"+30 dias pagos"**.
  → Próximo passo (opcional): ligar o pagamento automático (o gateway avisa o sistema e libera sozinho).

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
- [ ] Logo e cores definitivas (hoje: verde do MatrizPro e ícone padrão).
- [ ] Nome da empresa/CNPJ para aparecer nos relatórios e recibos.

## 🧪 Dados de exemplo

- A sua conta tem uma **base de demonstração**: 115 matrizes, 6 reprodutores, 789 leitegadas e **10.000 leitões** (2022 até hoje).
- Quando quiser começar com dados reais: **Configurações → Remover dados de exemplo** (apaga só a demonstração).
- Para recriar a base: rodar `supabase/seed/base_exemplo_karen.sql` no SQL Editor do Supabase.

## 🧹 Outros

- [ ] A senha do banco de dados (gerada pelo Supabase) não foi anotada — se algum dia precisar, redefinir em Supabase → Project Settings → Database.
- [ ] Desativar o tradutor automático do Chrome no site do Supabase (ele trava o painel).

---

### Onde fica cada coisa

| O quê | Arquivo |
|---|---|
| Valor, WhatsApp, link de pagamento, dias de teste | `src/config/negocio.ts` |
| Texto do manual / perguntas frequentes | `src/content/manual.json` → `npm run manual` |
| Regras do banco (teste, bloqueio, admin) | `supabase/migrations/002_reprodutores_e_assinaturas.sql` |
| Base de exemplo | `supabase/seed/base_exemplo_karen.sql` |
| Endereço e chave pública do Supabase | `src/lib/supabase.ts` |
