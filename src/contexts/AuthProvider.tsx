import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigurado } from "@/lib/supabase";
import { traduzirErroAuth } from "@/lib/authValidacao";
import { encerrarSincronizacao, definirDonoLocal } from "@/lib/sincronizacao";
import { useStore } from "@/store/useStore";
import { AuthContext, AuthContextValue } from "./auth";

/** Para onde o link de confirmação do email leva o usuário de volta. */
const urlRetornoConfirmacao = () => `${window.location.origin}/`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

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
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
      setCarregando(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    return error ? traduzirErroAuth(error) : null;
  }, []);

  const cadastrar = useCallback(async (email: string, senha: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { emailRedirectTo: urlRetornoConfirmacao() },
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

  const reenviarConfirmacao = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: urlRetornoConfirmacao() },
    });
    return error ? traduzirErroAuth(error) : null;
  }, []);

  const sair = useCallback(async () => {
    // 1) Grava na nuvem o que ainda estiver pendente e para a sincronização
    await encerrarSincronizacao();
    await supabase.auth.signOut();
    // 2) Limpa os dados deste navegador (o próximo usuário não os verá)
    useStore.getState().resetarDados();
    definirDonoLocal(null);
    setSession(null);
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, carregando, entrar, cadastrar, reenviarConfirmacao, sair }),
    [session, carregando, entrar, cadastrar, reenviarConfirmacao, sair]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
