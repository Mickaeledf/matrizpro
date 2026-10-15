// ============================================================================
// MatrizPro — Edge Function "pagamentos" (SyncPay, PIX)
//
// Três usos:
//   1) { acao: "criar", plano, nome, cpf, celular }  (usuário logado)
//      Cria o pedido em public.pagamentos, gera a cobrança PIX na SyncPay e devolve
//      o código "copia e cola" (o app mostra o QR Code).
//   2) { acao: "confirmar", pedido }                 (usuário logado)
//      Consulta a cobrança na SyncPay e libera o plano se estiver paga.
//   3) Webhook da SyncPay: ...?pedido=<id> (aviso de mudança de status).
//
// Segurança: o acesso só é liberado depois de consultar a transação DIRETO na API da
// SyncPay (status "completed", moeda BRL e valor >= ao do plano). O conteúdo do aviso
// (webhook) nunca é usado como prova de pagamento.
//
// Segredos (Supabase → Edge Functions → Secrets), colados pela Karen:
//   SYNCPAY_CLIENT_ID      → client_id gerado no painel da SyncPay
//   SYNCPAY_CLIENT_SECRET  → client_secret gerado no painel da SyncPay
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente nas Edge Functions.
//
// Ao publicar: desative "Verify JWT" desta função (a SyncPay chama sem login;
// os pedidos do app são conferidos aqui mesmo, pelo token do usuário).
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

// Precisa ficar igual a src/config/negocio.ts
const PLANOS: Record<string, { nome: string; valor: number }> = {
  mensal: { nome: "Mensal", valor: 97.9 },
  semestral: { nome: "Semestral (6 meses)", valor: 489.5 },
};

const SYNCPAY_API = "https://api.syncpayments.com.br/api/partner/v1";

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

const configurado = () => !!Deno.env.get("SYNCPAY_CLIENT_ID") && !!Deno.env.get("SYNCPAY_CLIENT_SECRET");

// --------------------------------------------------------------------- SyncPay
// O token vale 1 hora; a SyncPay pede para reaproveitar em vez de gerar a cada chamada.
let tokenCache: { token: string; expira: number } | null = null;

async function tokenSyncPay(): Promise<string> {
  if (tokenCache && tokenCache.expira > Date.now() + 60_000) return tokenCache.token;
  const resp = await fetch(`${SYNCPAY_API}/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("SYNCPAY_CLIENT_ID"),
      client_secret: Deno.env.get("SYNCPAY_CLIENT_SECRET"),
    }),
  });
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok || !corpo.access_token) throw new Error(`SyncPay auth ${resp.status}: ${JSON.stringify(corpo).slice(0, 200)}`);
  tokenCache = { token: corpo.access_token, expira: Date.now() + (Number(corpo.expires_in) || 3600) * 1000 };
  return tokenCache.token;
}

async function chamarSyncPay(caminho: string, init: RequestInit = {}) {
  const token = await tokenSyncPay();
  const resp = await fetch(`${SYNCPAY_API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const corpo = await resp.json().catch(() => ({}));
  if (resp.status === 401) tokenCache = null;
  return { ok: resp.ok, status: resp.status, corpo };
}

// ------------------------------------------------------------------ validações
const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (const d of base) soma += Number(d) * peso--;
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

// --------------------------------------------------------------- processamento
const STATUS: Record<string, string> = {
  pending: "pendente",
  completed: "aprovado",
  failed: "recusado",
  refunded: "estornado",
  med: "estornado",
};

interface Pedido {
  id: string;
  user_id: string;
  status: string;
  pagamento_id: string | null;
}

/** Consulta a cobrança na SyncPay e aplica no banco. Retorna o status final do pedido. */
async function processarPedido(pedido: Pedido): Promise<string> {
  if (pedido.status === "aprovado") return "aprovado";
  if (!pedido.pagamento_id) return pedido.status;

  const r = await chamarSyncPay(`/transaction/${encodeURIComponent(pedido.pagamento_id)}`);
  if (!r.ok) throw new Error(`SyncPay transação ${r.status}: ${JSON.stringify(r.corpo).slice(0, 200)}`);
  const t = (r.corpo?.data ?? {}) as { status?: string; amount?: number; currency?: string };

  const status = STATUS[t.status ?? ""] ?? "pendente";
  if (status === "aprovado") {
    if (t.currency && t.currency !== "BRL") throw new Error(`Moeda inesperada: ${t.currency}`);
    const { error } = await db.rpc("registrar_pagamento_aprovado", {
      p_pedido: pedido.id,
      p_pagamento_id: pedido.pagamento_id,
      p_valor_pago: Number(t.amount),
      p_forma: "pix",
    });
    if (error) throw new Error(error.message);
    return "aprovado";
  }
  if (status !== pedido.status) {
    await db.from("pagamentos").update({ status }).eq("id", pedido.id).neq("status", "aprovado");
  }
  return status;
}

async function usuarioDaRequisicao(req: Request) {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  return error ? null : data.user;
}

const ehUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  const url = new URL(req.url);
  let corpo: Record<string, unknown> = {};
  try {
    corpo = await req.json();
  } catch {
    // aviso sem corpo
  }

  try {
    // ---------------------------------------------------------------- app
    if (corpo.acao === "criar" || corpo.acao === "confirmar") {
      const usuario = await usuarioDaRequisicao(req);
      if (!usuario) return json({ erro: "Faça login novamente." }, 401);
      if (!configurado()) {
        return json({ erro: "O pagamento online ainda não foi ativado. Fale com o suporte.", naoConfigurado: true }, 503);
      }

      if (corpo.acao === "criar") {
        const plano = String(corpo.plano ?? "");
        const info = PLANOS[plano];
        if (!info) return json({ erro: "Plano inválido." }, 400);

        const nome = String(corpo.nome ?? "").trim().replace(/\s+/g, " ");
        const cpf = soDigitos(corpo.cpf);
        const celular = soDigitos(corpo.celular);
        if (nome.length < 3 || nome.length > 100) return json({ erro: "Informe o nome completo." }, 400);
        if (!cpfValido(cpf)) return json({ erro: "CPF inválido." }, 400);
        if (!/^\d{10,11}$/.test(celular)) return json({ erro: "Celular inválido. Use DDD + número." }, 400);

        const { data: pedido, error } = await db
          .from("pagamentos")
          .insert({ user_id: usuario.id, plano, valor: info.valor, gateway: "syncpay" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        const r = await chamarSyncPay("/cash-in", {
          method: "POST",
          body: JSON.stringify({
            amount: info.valor,
            description: `MatrizPro - plano ${info.nome}`,
            webhook_url: `${SUPABASE_URL}/functions/v1/pagamentos?pedido=${pedido.id}`,
            client: { name: nome, cpf, email: usuario.email, phone: celular },
          }),
        });
        if (!r.ok || !r.corpo?.pix_code || !r.corpo?.identifier) {
          await db.from("pagamentos").update({ status: "cancelado" }).eq("id", pedido.id);
          console.error("[pagamentos] cash-in recusado", r.status, JSON.stringify(r.corpo).slice(0, 300));
          const motivo = r.status === 422 ? " Confira nome, CPF e celular." : "";
          return json({ erro: `A SyncPay não conseguiu gerar o PIX.${motivo}` }, 502);
        }

        await db
          .from("pagamentos")
          .update({ pagamento_id: r.corpo.identifier, pix_codigo: r.corpo.pix_code, forma: "pix" })
          .eq("id", pedido.id);
        return json({ pedido: pedido.id, pix: r.corpo.pix_code, valor: info.valor });
      }

      // confirmar
      const { data: pedido } = await db
        .from("pagamentos")
        .select("id, user_id, status, pagamento_id")
        .eq("id", String(corpo.pedido ?? ""))
        .maybeSingle();
      if (!pedido || pedido.user_id !== usuario.id) return json({ erro: "Pedido não encontrado." }, 404);
      return json({ status: await processarPedido(pedido as Pedido) });
    }

    // ------------------------------------------------------------ webhook
    // Identifica o pedido pelo endereço (?pedido=) ou pelo id da transação no aviso;
    // o status é sempre conferido na API da SyncPay.
    const dados = (corpo.data ?? {}) as Record<string, unknown>;
    const pedidoId = url.searchParams.get("pedido");
    const identificador = [corpo.id, corpo.identifier, corpo.reference_id, dados.id, dados.identifier, dados.reference_id].find(ehUuid);

    let consulta = db.from("pagamentos").select("id, user_id, status, pagamento_id");
    if (ehUuid(pedidoId)) consulta = consulta.eq("id", pedidoId);
    else if (identificador) consulta = consulta.eq("pagamento_id", identificador);
    else return json({ ok: true, ignorado: true });

    const { data: pedido } = await consulta.maybeSingle();
    if (!pedido) return json({ ok: true, ignorado: true });
    if (!configurado()) return json({ erro: "SyncPay não configurada" }, 503);

    return json({ ok: true, status: await processarPedido(pedido as Pedido) });
  } catch (e) {
    console.error("[pagamentos]", e);
    // Erro 500 faz a SyncPay tentar avisar de novo mais tarde
    return json({ erro: "Não foi possível processar o pagamento agora. Tente novamente em instantes." }, 500);
  }
});
