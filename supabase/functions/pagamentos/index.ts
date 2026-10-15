// ============================================================================
// MatrizPro — Edge Function "pagamentos" (Mercado Pago, Checkout Pro)
//
// Três usos:
//   1) { acao: "criar", plano, retorno }  (usuário logado)
//      Cria o pedido em public.pagamentos e devolve o link de pagamento do Mercado Pago.
//   2) { acao: "confirmar", pedido }      (usuário logado, ao voltar do Mercado Pago)
//      Consulta no Mercado Pago os pagamentos daquele pedido e libera o plano se aprovado.
//   3) Webhook do Mercado Pago (notificação automática quando o pagamento muda).
//
// Segurança: o acesso só é liberado depois de consultar o pagamento DIRETO na API do
// Mercado Pago (status "approved", moeda BRL e valor >= ao do plano). Nada do que chega
// pelo navegador ou pela notificação é usado sem essa conferência.
//
// Segredos (Supabase → Edge Functions → Secrets), colados pela Karen:
//   MP_ACCESS_TOKEN     → Access Token de PRODUÇÃO do Mercado Pago (APP_USR-...)
//   MP_WEBHOOK_SECRET   → (opcional) "Assinatura secreta" das notificações do Mercado Pago
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente nas Edge Functions.
//
// Ao publicar: desative "Verify JWT" desta função (o Mercado Pago chama sem login;
// os pedidos do app são conferidos aqui mesmo, pelo token do usuário).
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

// Precisa ficar igual a src/config/negocio.ts
const PLANOS: Record<string, { nome: string; valor: number }> = {
  mensal: { nome: "Mensal", valor: 97.9 },
  semestral: { nome: "Semestral (6 meses)", valor: 489.5 },
};

const MP_API = "https://api.mercadopago.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface PagamentoMP {
  id: number;
  status: string;
  currency_id: string;
  transaction_amount: number;
  payment_method_id?: string;
  external_reference?: string | null;
}

async function chamarMP(caminho: string, init: RequestInit = {}) {
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");
  const resp = await fetch(`${MP_API}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Mercado Pago ${resp.status}: ${JSON.stringify(corpo).slice(0, 300)}`);
  return corpo;
}

const STATUS: Record<string, string> = {
  pending: "pendente",
  in_process: "pendente",
  authorized: "pendente",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "estornado",
  charged_back: "estornado",
};

/** Aplica no banco o que o Mercado Pago diz sobre um pagamento. Retorna o status final. */
async function processarPagamento(pag: PagamentoMP): Promise<string> {
  const pedido = pag.external_reference;
  if (!pedido || !/^[0-9a-f-]{36}$/i.test(pedido)) return "ignorado";

  if (pag.status === "approved") {
    if (pag.currency_id !== "BRL") throw new Error(`Moeda inesperada: ${pag.currency_id}`);
    const { error } = await db.rpc("registrar_pagamento_aprovado", {
      p_pedido: pedido,
      p_pagamento_id: String(pag.id),
      p_valor_pago: pag.transaction_amount,
      p_forma: pag.payment_method_id ?? null,
    });
    if (error) throw new Error(error.message);
    return "aprovado";
  }

  const status = STATUS[pag.status];
  if (status) {
    // Estorno vale mesmo depois de aprovado (a administradora decide se bloqueia);
    // os demais não sobrescrevem um pedido já aprovado.
    let q = db.from("pagamentos").update({ status, pagamento_id: String(pag.id) }).eq("id", pedido);
    if (status !== "estornado") q = q.neq("status", "aprovado");
    await q;
  }
  return status ?? pag.status;
}

/** Confere a assinatura da notificação, quando MP_WEBHOOK_SECRET estiver configurado. */
async function notificacaoValida(req: Request, dataId: string | null): Promise<boolean> {
  const segredo = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!segredo) return true;
  const assinatura = req.headers.get("x-signature") ?? "";
  const partes = Object.fromEntries(assinatura.split(",").map((p) => p.trim().split("=", 2)));
  if (!partes.ts || !partes.v1) return false;
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifesto = "";
  if (id) manifesto += `id:${id};`;
  const requestId = req.headers.get("x-request-id");
  if (requestId) manifesto += `request-id:${requestId};`;
  manifesto += `ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(manifesto));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === partes.v1;
}

async function usuarioDaRequisicao(req: Request) {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  return error ? null : data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const url = new URL(req.url);
  let corpo: Record<string, unknown> = {};
  try {
    corpo = await req.json();
  } catch {
    // notificações antigas do Mercado Pago podem vir sem corpo
  }

  try {
    // ---------------------------------------------------------------- app
    if (corpo.acao === "criar" || corpo.acao === "confirmar") {
      const usuario = await usuarioDaRequisicao(req);
      if (!usuario) return json({ erro: "Faça login novamente." }, 401);
      if (!Deno.env.get("MP_ACCESS_TOKEN")) {
        return json({ erro: "O pagamento online ainda não foi ativado. Fale com o suporte.", naoConfigurado: true }, 503);
      }

      if (corpo.acao === "criar") {
        const plano = String(corpo.plano ?? "");
        const info = PLANOS[plano];
        if (!info) return json({ erro: "Plano inválido." }, 400);

        let origem = "";
        try {
          const r = new URL(String(corpo.retorno ?? ""));
          if (r.protocol === "https:" || r.hostname === "localhost") origem = r.origin;
        } catch {
          // sem endereço de retorno válido
        }

        const { data: pedido, error } = await db
          .from("pagamentos")
          .insert({ user_id: usuario.id, plano, valor: info.valor })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        const voltar = origem ? `${origem}/assinatura?pedido=${pedido.id}` : undefined;
        const preferencia = await chamarMP("/checkout/preferences", {
          method: "POST",
          body: JSON.stringify({
            items: [
              { id: plano, title: `MatrizPro — plano ${info.nome}`, quantity: 1, unit_price: info.valor, currency_id: "BRL" },
            ],
            payer: { email: usuario.email },
            external_reference: pedido.id,
            notification_url: `${SUPABASE_URL}/functions/v1/pagamentos`,
            statement_descriptor: "MATRIZPRO",
            ...(voltar && {
              back_urls: { success: voltar, pending: voltar, failure: voltar },
              // O Mercado Pago só aceita volta automática para endereços https
              ...(origem.startsWith("https:") && { auto_return: "approved" }),
            }),
          }),
        });

        await db.from("pagamentos").update({ preferencia_id: preferencia.id }).eq("id", pedido.id);
        return json({ url: preferencia.init_point, pedido: pedido.id });
      }

      // confirmar
      const pedidoId = String(corpo.pedido ?? "");
      const { data: pedido } = await db
        .from("pagamentos")
        .select("id, user_id, status")
        .eq("id", pedidoId)
        .maybeSingle();
      if (!pedido || pedido.user_id !== usuario.id) return json({ erro: "Pedido não encontrado." }, 404);
      if (pedido.status === "aprovado") return json({ status: "aprovado" });

      const busca = await chamarMP(`/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc`);
      const resultados = (busca.results ?? []) as PagamentoMP[];
      let final = "pendente";
      for (const pag of resultados) {
        const s = await processarPagamento(pag);
        if (s === "aprovado") return json({ status: "aprovado" });
        if (final === "pendente" && s !== "ignorado") final = s;
      }
      return json({ status: resultados.length ? final : "pendente" });
    }

    // ------------------------------------------------------------ webhook
    const tipo = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (corpo.type as string) ?? (corpo.topic as string);
    const dados = (corpo.data ?? {}) as { id?: string | number };
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? (dados.id != null ? String(dados.id) : null);

    if (tipo !== "payment" || !dataId) return json({ ok: true, ignorado: true });
    if (!(await notificacaoValida(req, url.searchParams.get("data.id") ?? dataId))) {
      return json({ erro: "Assinatura inválida" }, 401);
    }

    const pag = (await chamarMP(`/v1/payments/${encodeURIComponent(dataId)}`)) as PagamentoMP;
    const status = await processarPagamento(pag);
    return json({ ok: true, status });
  } catch (e) {
    console.error("[pagamentos]", e);
    // Erro 500 faz o Mercado Pago tentar de novo mais tarde
    return json({ erro: "Não foi possível processar o pagamento agora. Tente novamente em instantes." }, 500);
  }
});
