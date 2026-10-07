import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CREDENCIAIS DO SUPABASE — COLE AS SUAS AQUI
// ----------------------------------------------------------------------------
// Onde encontrar: Supabase Dashboard → seu projeto → Project Settings → API
//   (ou o botão "Connect" no topo do projeto).
//
// 1) "Project URL"  → cole em SUPABASE_URL
//    Exemplo: "https://abcdefghijklmnop.supabase.co"
//
// 2) "Publishable key" (ou a antiga "anon public") → cole em SUPABASE_ANON_KEY
//    Essa chave é pública e pode ficar no front-end.
//    NUNCA cole aqui a "service_role" / "secret key": ela dá acesso total ao banco.
// ============================================================================
const SUPABASE_URL = "https://txcglwflynguuazsjuya.supabase.co"; // ← Project URL
const SUPABASE_ANON_KEY = "sb_publishable_ChKaaH80ePU0XkVhRwkhjg_e4KM0D-N"; // ← chave pública (publishable/anon)

/** Indica se as credenciais acima já foram preenchidas. */
export const supabaseConfigurado =
  !SUPABASE_URL.includes("SEU-PROJETO") && !SUPABASE_ANON_KEY.startsWith("COLE-");

/**
 * Cliente único do Supabase usado em todo o app.
 * - persistSession: guarda a sessão no navegador (o usuário continua logado ao reabrir a página).
 * - autoRefreshToken: renova o token automaticamente antes de expirar.
 * - detectSessionInUrl: conclui o login quando o usuário volta pelo link de confirmação do email.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
