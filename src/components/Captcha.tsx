import { useEffect, useRef } from "react";

/**
 * Proteção contra robôs (Cloudflare Turnstile) no login, cadastro e "esqueci minha senha".
 *
 * TURNSTILE_SITE_KEY é a chave PÚBLICA do widget (Cloudflare → Turnstile → widget "MatrizPro").
 * Enquanto estiver vazia, o captcha fica desligado no app.
 * A chave SECRETA vai só no Supabase (Authentication → Attack Protection) — nunca aqui.
 * Ordem para ligar: 1) colar a site key aqui e publicar o site; 2) ligar o captcha no Supabase.
 */
export const TURNSTILE_SITE_KEY: string = "0x4AAAAAAFh4vCaWjP8zzYg6";

export const captchaAtivo = TURNSTILE_SITE_KEY !== "";

interface TurnstileApi {
  render: (el: HTMLElement, opcoes: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let carregandoScript: Promise<void> | null = null;
function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  carregandoScript ??= new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      carregandoScript = null;
      falha(new Error("Não foi possível carregar a verificação anti-robô."));
    };
    document.head.appendChild(s);
  });
  return carregandoScript;
}

/**
 * Caixa "Verificando que você é humano". Chama onToken com o token (ou null quando expira).
 * Cada token vale para UMA tentativa: troque a prop `key` para gerar outro.
 */
export function Captcha({ onToken, onErro }: { onToken: (token: string | null) => void; onErro?: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const aoToken = useRef(onToken);
  aoToken.current = onToken;
  const aoErro = useRef(onErro);
  aoErro.current = onErro;

  useEffect(() => {
    if (!captchaAtivo) return;
    let id: string | null = null;
    let ativo = true;
    carregarScript()
      .then(() => {
        if (!ativo || !caixa.current || !window.turnstile) return;
        id = window.turnstile.render(caixa.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "pt-br",
          theme: "light",
          size: "flexible",
          callback: (t: string) => aoToken.current(t),
          "expired-callback": () => aoToken.current(null),
          "error-callback": () => {
            aoToken.current(null);
            aoErro.current?.();
          },
        });
      })
      .catch(() => {
        aoToken.current(null);
        aoErro.current?.();
      });
    return () => {
      ativo = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!captchaAtivo) return null;
  return <div ref={caixa} className="min-h-[65px]" />;
}
