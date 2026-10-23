import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigurado } from "@/lib/supabase";
import { traduzirErroAuth } from "@/lib/authValidacao";
import { encerrarSincronizacao, definirDonoLocal, limparPendencias } from "@/lib/sincronizacao";
import { useStore } from "@/store/useStore";
import { useAssinatura } from "@/lib/assinatura";
import { useMensagens } from "@/lib/mensagens";
import { AuthContext, AuthContextValue } from "./auth";
import { VERSAO_TERMOS } from "@/content/legal";

/** Para onde o link de confirmação do email leva o usuário de volta. */
const urlRetornoConfirmacao = () => `${window.location.origin}/`;
/** Página onde o usuário cria a nova senha depois de clicar no link do email. */
const urlRedefinirSenha = () => `${window.location.origin}/redefinir-senha`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [emRecuperacao, setEmRecuperacao] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }

    // 1) Ao abrir a página: verifica se já existe uma sessão salva no navegador.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });

    // 2) Mantém o estado sincronizado: login, logout, renovação de token,
    //    retorno pelo link de confirmação e alterações feitas em outras abas.
    const { data } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      // Chegou pelo link "redefinir senha" do email: mostra a tela de nova senha
      if (evento === "PASSWORD_RECOVERY") {
        setEmRecuperacao(true);
        if (window.location.pathname !== "/redefinir-senha") window.location.replace("/redefinir-senha");
      }
      setSession(novaSessao);
      setCarregando(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const entrar = useCallback(async (email: string, senha: string, captcha?: string | null) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
      options: { captchaToken: captcha ?? undefined },
    });
    return error ? traduzirErroAuth(error) : null;
  }, []);

  const cadastrar = useCallback(async (email: string, senha: string, captcha?: string | null) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: urlRetornoConfirmacao(),
        captchaToken: captcha ?? undefined,
        // Prova do aceite (LGPD/CDC): qual versão dos Termos e quando
        data: { termos_versao: VERSAO_TERMOS, termos_aceitos_em: new Date().toISOString() },
      },
    });

    if (error) return { erro: traduzirErroAuth(error), precisaConfirmar: false };

    // Com a confirmação de email ativa, o Supabase NÃO retorna erro para email já
    // cadastrado (proteção contra descoberta de contas): ele devolve um usuário
    // sem "identities". Tratamos esse caso como "email já cadastrado".
    if (data.user && data.user.identities?.length === 0) {
      return { erro: "Este email já está cadastrado. Faça login ou use outro email.", precisaConfirmar: false };
    }

    // Se veio uma sessão, a opção "Confirm email" está DESLIGADA no projeto.
    // Para cumprir a regra de só entrar após confirmar, encerramos a sessão.
    if (data.session) {
      console.warn(
        "[MatrizPro] A confirmação de email está desativada no Supabase. " +
          "Ative em Authentication → Sign In / Providers → Email → Confirm email."
      );
      await supabase.auth.signOut();
    }

    return { erro: null, precisaConfirmar: true };
  }, []);

  const reenviarConfirmacao = useCallback(async (email: string, captcha?: string | null) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: urlRetornoConfirmacao(), captchaToken: captcha ?? undefined },
    });
    return error ? traduzirErroAuth(error) : null;
  }, []);

  const enviarLinkRedefinicao = useCallback(async (email: string, captcha?: string | null) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: urlRedefinirSenha(),
      captchaToken: captcha ?? undefined,
    });
    return error ? traduzirErroAuth(error) : null;
  }, []);

  const definirNovaSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (!error) setEmRecuperacao(false);
    return error ? traduzirErroAuth(error) : null;
  }, []);

  const sair = useCallback(async () => {
    // 1) Grava na nuvem o que ainda estiver pendente e para a sincronização
    await encerrarSincronizacao();
    const { data } = await supabase.auth.getSession();
    if (data.session) limparPendencias(data.session.user.id);
    await supabase.auth.signOut();
    // 2) Limpa os dados deste navegador (o próximo usuário não os verá)
    useStore.getState().resetarDados();
    definirDonoLocal(null);
    useAssinatura.getState().limpar();
    useMensagens.getState().limpar();
    setSession(null);
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      carregando,
      entrar,
      cadastrar,
      reenviarConfirmacao,
      enviarLinkRedefinicao,
      definirNovaSenha,
      emRecuperacao,
      sair,
    }),
    [session, carregando, entrar, cadastrar, reenviarConfirmacao, enviarLinkRedefinicao, definirNovaSenha, emRecuperacao, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
