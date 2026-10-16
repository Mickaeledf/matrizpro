# Como salvar o MatrizPro no GitHub (passo a passo da Karen)

Abra o terminal **dentro da pasta do projeto** (`matrizpro`) e use os comandos abaixo.
Toda vez que algo chega no GitHub, a Vercel atualiza o site **matrizpro.vercel.app** sozinha (~1 minuto).

---

## 1) Antes de começar a mexer — SEMPRE

Traz para o seu computador o que mudou no GitHub (por exemplo, algo que você editou direto no site do GitHub):

```bash
git pull
```

## 2) Depois de mexer — para salvar

```bash
git add .
git commit -m "o que eu mudei, em poucas palavras"
git push
git status
```

| Comando | O que faz |
|---|---|
| `git add .` | separa tudo o que mudou para salvar |
| `git commit -m "..."` | cria o "ponto de salvamento" com uma descrição |
| `git push` | envia para o GitHub (e o site atualiza) |
| `git status` | confere: tem que aparecer **"nothing to commit, working tree clean"** ou **"up to date"** |

A ordem é sempre essa: **add → commit → push → status**.

---

## Mensagens que podem aparecer

| Mensagem | O que significa | O que fazer |
|---|---|---|
| `nothing to commit, working tree clean` | não tem nada novo para salvar | nada, está tudo salvo |
| `Your branch is up to date` | seu computador e o GitHub estão iguais | nada |
| `Your branch is behind` | o GitHub tem coisa nova que você não tem | `git pull` |
| `rejected ... fetch first` (no `git push`) | alguém (ou você, pelo site) mudou o GitHub antes | `git pull` e depois `git push` de novo |
| `CONFLICT` | a mesma linha foi mudada nos dois lugares | **pare e chame o Claude** |
| `LF will be replaced by CRLF` | só um aviso do Windows sobre fim de linha | pode ignorar |

---

## Editou direto no site do GitHub?

Tudo bem, só lembre: na próxima vez que for mexer no computador, rode **`git pull` primeiro**.
Se esquecer e der erro no `git push`, rode `git pull` e depois `git push` de novo.

## Nunca faça

- `git push --force` (apaga o que está no GitHub)
- Colocar senhas ou chaves (SyncPay, Supabase secret) em qualquer arquivo do projeto
