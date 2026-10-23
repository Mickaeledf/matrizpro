/**
 * Termos de Uso e Política de Privacidade do MatrizPro.
 * Ao alterar o texto, atualize VERSAO_TERMOS (fica registrada no cadastro de quem aceitou).
 * Modelo inicial — recomenda-se revisão por advogado(a) antes de escalar as vendas.
 */

export const VERSAO_TERMOS = "2026-10-23";
export const CONTATO_EMAIL = "social.mediacreative.br@gmail.com";

export interface SecaoLegal {
  titulo: string;
  paragrafos: string[];
}

export interface DocumentoLegal {
  titulo: string;
  resumo: string;
  secoes: SecaoLegal[];
}

export const TERMOS_DE_USO: DocumentoLegal = {
  titulo: "Termos de Uso",
  resumo:
    "Regras para usar o MatrizPro: o que o sistema oferece, como funcionam o teste grátis e as assinaturas, e as responsabilidades de cada parte.",
  secoes: [
    {
      titulo: "1. Sobre o MatrizPro",
      paragrafos: [
        "O MatrizPro é um sistema on-line de gestão para suinocultura: cadastro de matrizes e reprodutores, ciclo reprodutivo, lotes, leitões, pesagens, saúde, vacinas, custos, faturamento e relatórios.",
        `Ao criar uma conta e marcar "Li e aceito", você concorda com estes Termos e com a Política de Privacidade. Dúvidas: ${CONTATO_EMAIL}.`,
      ],
    },
    {
      titulo: "2. Cadastro e acesso",
      paragrafos: [
        "Para usar o sistema é preciso criar uma conta com email válido e senha, e confirmar o email pelo link enviado.",
        "A conta é pessoal. Você é responsável por manter a senha em segredo e por tudo o que for feito com o seu acesso. Se suspeitar de uso indevido, troque a senha (Configurações → Alterar senha) e nos avise.",
        "Cada conta enxerga somente os próprios dados. Nenhum outro cliente tem acesso às informações da sua criação.",
      ],
    },
    {
      titulo: "3. Teste grátis",
      paragrafos: [
        "Todo novo cadastro tem 7 (sete) dias de teste grátis, sem cartão, com acesso às funções básicas (Painel, Matrizes, Lotes, Mensagens, Suporte e Configurações).",
        "Ao final do teste, para continuar usando é preciso assinar um plano. Os dados cadastrados durante o teste continuam guardados e voltam a ficar disponíveis assim que a assinatura for paga.",
      ],
    },
    {
      titulo: "4. Planos, pagamento e renovação",
      paragrafos: [
        "Planos disponíveis: Mensal (R$ 97,90 por 30 dias) e Semestral (R$ 489,50 por 180 dias — 6 meses pelo preço de 5). Os valores podem mudar; quem já pagou mantém o preço até o fim do período contratado.",
        "O pagamento é feito por PIX, processado pela SyncPay. O plano é liberado automaticamente depois que o pagamento é confirmado.",
        "Não há renovação automática nem cobrança recorrente: ao fim do período, você escolhe se quer pagar um novo período. Avisamos com 10 dias de antecedência.",
        "Sem plano ativo, o acesso fica limitado à página de assinatura e não é possível gravar novos dados; nada é apagado por isso.",
      ],
    },
    {
      titulo: "5. Direito de arrependimento e cancelamento",
      paragrafos: [
        "Conforme o Código de Defesa do Consumidor (art. 49), você pode desistir da contratação em até 7 (sete) dias a contar do pagamento, com devolução integral do valor pago. Basta pedir pelo email de contato.",
        "Depois desse prazo, você pode deixar de usar quando quiser — como não há renovação automática, basta não pagar o próximo período. Valores de períodos já iniciados não são devolvidos, salvo falha do serviço atribuível ao MatrizPro.",
      ],
    },
    {
      titulo: "6. Seus dados e a sua criação",
      paragrafos: [
        "Os dados que você cadastra (animais, lotes, pesagens, custos, vendas etc.) são seus. Você pode exportá-los a qualquer momento em Configurações → Exportar backup e em Relatórios (PDF e Excel).",
        "Usamos esses dados apenas para fazer o sistema funcionar para você, como explicado na Política de Privacidade.",
      ],
    },
    {
      titulo: "7. Uso adequado",
      paragrafos: [
        "Não é permitido: tentar acessar dados de outros clientes; atacar, sobrecarregar ou copiar o sistema; usar o MatrizPro para atividades ilegais; ou compartilhar o acesso para revenda do serviço.",
        "O descumprimento pode levar à suspensão da conta, após aviso, quando possível.",
      ],
    },
    {
      titulo: "8. Disponibilidade e responsabilidades",
      paragrafos: [
        "Trabalhamos para manter o sistema no ar e os dados salvos com segurança, mas podem ocorrer interrupções por manutenção, falhas de internet ou de fornecedores. Avisaremos pela caixa de Mensagens sempre que possível.",
        "O MatrizPro é uma ferramenta de apoio à gestão. Indicadores, alertas e relatórios dependem das informações cadastradas por você e não substituem a orientação de médico-veterinário ou zootecnista. As decisões de manejo, sanidade e comercialização são do produtor.",
      ],
    },
    {
      titulo: "9. Alterações destes Termos",
      paragrafos: [
        "Estes Termos podem ser atualizados. Mudanças importantes serão avisadas pela caixa de Mensagens do sistema com antecedência. A data da versão em vigor aparece no topo desta página.",
      ],
    },
    {
      titulo: "10. Foro",
      paragrafos: [
        "Fica eleito o foro do domicílio do consumidor para resolver qualquer questão relacionada a estes Termos, conforme o Código de Defesa do Consumidor.",
      ],
    },
  ],
};

export const POLITICA_DE_PRIVACIDADE: DocumentoLegal = {
  titulo: "Política de Privacidade",
  resumo:
    "Quais dados o MatrizPro coleta, para quê, com quem compartilha e como você exerce seus direitos pela Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).",
  secoes: [
    {
      titulo: "1. Quem cuida dos seus dados",
      paragrafos: [
        `O MatrizPro é o controlador dos dados pessoais tratados no sistema. Contato para qualquer assunto de privacidade (inclusive o encarregado/DPO): ${CONTATO_EMAIL}.`,
      ],
    },
    {
      titulo: "2. Dados que coletamos",
      paragrafos: [
        "Dados de cadastro: email e senha (a senha é guardada de forma criptografada; ninguém da equipe consegue vê-la).",
        "Dados da sua criação: tudo o que você cadastrar no sistema — matrizes, reprodutores, lotes, leitões, pesagens, vacinas, saúde, custos, vendas e configurações da fazenda (nome, responsável, cidade).",
        "Dados de pagamento: para gerar o PIX, nome, CPF, celular e email do pagador são enviados à SyncPay. O MatrizPro guarda apenas o plano, o valor, a data e a situação do pagamento — não guarda o CPF.",
        "Dados técnicos: data do cadastro e do último acesso, registros de segurança do login e informações básicas do navegador necessárias para o funcionamento.",
      ],
    },
    {
      titulo: "3. Para que usamos (e com qual base legal)",
      paragrafos: [
        "Prestar o serviço contratado: criar e manter sua conta, guardar e mostrar seus dados, gerar alertas e relatórios (execução de contrato — LGPD art. 7º, V).",
        "Cobrar e liberar a assinatura, e cumprir obrigações fiscais (execução de contrato e obrigação legal — art. 7º, II e V).",
        "Enviar emails essenciais (confirmação de cadastro, troca de senha) e avisos no sistema sobre assinatura e mudanças importantes (execução de contrato).",
        "Segurança e prevenção a fraudes, como bloquear tentativas de acesso indevido (legítimo interesse — art. 7º, IX).",
        "Não vendemos seus dados e não os usamos para publicidade de terceiros.",
      ],
    },
    {
      titulo: "4. Com quem compartilhamos",
      paragrafos: [
        "Somente com os fornecedores necessários para o sistema funcionar, que tratam os dados em nosso nome:",
        "• Supabase — banco de dados, login e servidores (dados armazenados no Brasil, região São Paulo).",
        "• Vercel — hospedagem do site.",
        "• SyncPay — processamento dos pagamentos por PIX.",
        "• Provedor de email — envio dos emails de confirmação e de troca de senha.",
        "Também podemos compartilhar dados quando exigido por lei ou ordem judicial.",
      ],
    },
    {
      titulo: "5. Armazenamento no seu aparelho",
      paragrafos: [
        "O sistema guarda no navegador a sessão de login e uma cópia dos seus dados para abrir mais rápido e não perder alterações feitas sem internet. Essa cópia é separada por conta e apagada ao clicar em Sair. Não usamos cookies de propaganda.",
      ],
    },
    {
      titulo: "6. Por quanto tempo guardamos",
      paragrafos: [
        "Enquanto a conta existir. Se a assinatura vencer, os dados continuam guardados para que você possa voltar. A pedido, excluímos a conta e todos os dados em até 15 dias, exceto o que a lei obrigar a manter (por exemplo, registros de pagamento para fins fiscais).",
      ],
    },
    {
      titulo: "7. Seus direitos (LGPD, art. 18)",
      paragrafos: [
        "Você pode, a qualquer momento: confirmar se tratamos seus dados; acessá-los; corrigi-los; pedir a portabilidade (o backup em Configurações já entrega tudo em arquivo); pedir a exclusão; saber com quem compartilhamos; e revogar consentimentos.",
        `Para exercer seus direitos, escreva para ${CONTATO_EMAIL}. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
      ],
    },
    {
      titulo: "8. Segurança",
      paragrafos: [
        "Usamos conexão criptografada (HTTPS), senhas criptografadas e regras no banco de dados que impedem uma conta de acessar os dados de outra. Os pagamentos só são liberados após conferência direta com a SyncPay.",
        "Nenhum sistema é 100% invulnerável. Em caso de incidente de segurança que possa trazer risco a você, avisaremos e comunicaremos a ANPD, como manda a lei.",
      ],
    },
    {
      titulo: "9. Alterações desta Política",
      paragrafos: [
        "Esta Política pode ser atualizada. Mudanças importantes serão avisadas pela caixa de Mensagens do sistema. A data da versão em vigor aparece no topo desta página.",
      ],
    },
  ],
};
