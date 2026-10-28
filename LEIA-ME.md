# Painel de Automação de DM do Instagram

Um painel web com login e um motor de respostas automáticas no direct do Instagram:
alguém comenta uma palavra num post seu, recebe uma DM com botão, toca no botão, a conversa
segue (mais mensagens, um link ou um arquivo) e o contato fica salvo como lead.

## O que tem em cada pasta

```
frontend/                  o painel (abre em qualquer host estático)
  index.html               página 1 (login) e página 2 (o sistema)
  estilo.css               visual (troque a cor de destaque em --destaque)
  config.js                SUPABASE_URL e SUPABASE_ANON_KEY (as únicas configurações do painel)
  app.js                   login, menu, Início, Calendário, Métricas, lista de automações
  editor.js                editor de automação + construtor de conversa + prévia ao vivo
supabase/sql/              scripts do banco (rodar na ordem)
  01_tabelas.sql           tabelas
  02_freio.sql             funções do freio de envio (OBRIGATÓRIO)
  03_rls.sql               regras de acesso + pasta de arquivos
  04_agendamento.sql       robôs agendados (pg_cron)
  05_retencao.sql          apaga dados com 12 meses sem interação (cumpre a política)
  06_interacoes.sql        visão da aba Interações (leads + contagem de mensagens)
  07_analises.sql          tabelas da aba Análises (posts e quem mais comenta)
  08_marcas_propostas.sql  tabelas das abas Marcas e Propostas
  09_variacoes.sql         guarda qual versão (teste A/B) cada pessoa recebeu
  10_midia.sql             permite apagar arquivos da biblioteca (janela Mídia)
  11_organizacao.sql       tabelas da antiga aba Organização (a aba foi tirada; as tabelas ficam sem uso)
  12_focos_metas.sql       tabelas da aba Focos e metas (planejamento, hábitos, metas e sonhos)
  13_mural_calendario.sql  pasta privada "mural" (fotos dos sonhos) e eventos do Calendário
  14_metas_passos.sql      primeiro passo de cada meta, categorias criadas por você e favoritas
  15_metas_detalhes.sql    janela Detalhes da Meta (meta numérica, reflexão e checklist)
supabase/functions/        funções na nuvem (Edge Functions)
  instagram-webhook/       o cérebro: recebe comentários, mensagens e toques em botão
  ig-scheduler/            o carteiro: esvazia a fila do freio e manda passos com atraso
  ig-token-refresh/        renova o token do Instagram
  ig-insights/             números da conta pra aba Análises (por período)
  ig-analises/             analisa posts e comentários (botão "Atualizar agora")
  ig-media/                lista os posts pro editor
  _shared/                 código usado pelas funções acima
servir.ps1                 servidor local pra Windows (sem instalar nada)
```

---

## Passo 0: testar agora, sem configurar nada

1. Abra o painel de um destes jeitos:
   - Dois cliques em `frontend/index.html` (abre como arquivo local), ou
   - Windows: na pasta do projeto, `powershell -ExecutionPolicy Bypass -File servir.ps1`
     (abre sozinho em `http://localhost:5173`), ou
   - Mac/Linux: na pasta `frontend`, `python3 -m http.server 5173` e abra `http://localhost:5173`.
2. Entre com **qualquer e-mail** e uma **senha de 5 dígitos** (ex: 12345).

Isso é o **modo de teste local**: dá pra navegar o sistema todo (menu, Início, Calendário,
Instagram, o editor de automação com a prévia ao vivo). Nada é salvo de verdade: ao clicar em
Salvar aparece um aviso. Os passos abaixo são pra colocar no ar, com login e dados salvos.

> O modo de teste só existe em `localhost`, `127.0.0.1` ou arquivo local. Num endereço de
> verdade (GitHub Pages, domínio próprio), o login é sempre pelo Supabase.

---

## Passo 1: criar o projeto no Supabase e rodar os scripts

1. Crie uma conta e um projeto em supabase.com.
2. Vá em **SQL Editor > New query** e rode, NESTA ORDEM, o conteúdo de:
   1. `supabase/sql/01_tabelas.sql`
   2. `supabase/sql/02_freio.sql`
   3. `supabase/sql/03_rls.sql`

> **Não pule o `02_freio.sql`.** Sem as funções `take_send_slot` e `record_send_result`, o
> freio falha fechado e NENHUMA DM por comentário sai: tudo vai pra fila e a fila nunca anda.

O `04_agendamento.sql` fica pra depois (passo 5).

## Passo 2: criar o usuário admin (e trancar o cadastro)

1. Em **Authentication > Users > Add user**, crie o seu usuário com e-mail e senha
   (marque "Auto Confirm User"). É esse login que vale quando o site estiver no ar.
2. **Importante:** em **Authentication > Sign In / Providers**, DESLIGUE
   "Allow new users to sign up". O painel não tem tela de cadastro, mas sem essa trava
   alguém poderia criar uma conta pela API e ler os seus leads.

## Passo 3: configurar os segredos das funções

Em **Edge Functions > Secrets** (ou pela CLI: `supabase secrets set NOME=valor`):

| Segredo | O que é |
|---|---|
| `IG_ACCESS_TOKEN` | token long-lived do Instagram (passo 6) |
| `IG_ACCOUNT_ID` | id numérico da conta do Instagram (passo 6) |
| `APP_SECRET` | segredo do app do Meta (App settings > Basic) |
| `APP_SECRET_ENFORCE` | `false` no começo; `true` depois que tudo funcionar |
| `VERIFY_TOKEN` | uma senha que você inventa (o aperto de mão do webhook) |
| `GRAPH_API_VERSION` | `v21.0` |
| `SCHED_SECRET` | outra senha que você inventa (protege os robôs agendados) |
| `TEST_IG_ACCOUNTS` | ids numéricos das contas de teste, separados por vírgula |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já vêm preenchidas automaticamente dentro das
funções; não precisa criar. A service_role NUNCA vai pro frontend.

## Passo 4: publicar as funções

Com a CLI do Supabase instalada, na pasta do projeto:

```bash
supabase login
supabase link --project-ref SEU_PROJETO

# Públicas (quem chama é o Meta ou o pg_cron, sem login):
supabase functions deploy instagram-webhook --no-verify-jwt
supabase functions deploy ig-scheduler --no-verify-jwt
supabase functions deploy ig-token-refresh --no-verify-jwt

# Do painel (exigem o login: deixe o Verify JWT ligado):
supabase functions deploy ig-insights
supabase functions deploy ig-media
supabase functions deploy ig-analises
```

A `instagram-webhook` PRECISA ser pública (`--no-verify-jwt`, ou "Verify JWT" desligado no
painel), senão o Meta não consegue chamar. O `ig-scheduler` e o `ig-token-refresh` são
protegidos pelo `SCHED_SECRET`.

A URL do webhook fica assim: `https://SEU_PROJETO.supabase.co/functions/v1/instagram-webhook`

## Passo 5: agendar os robôs

Abra `supabase/sql/04_agendamento.sql`, troque `SEU_PROJETO` e `SEU_SCHED_SECRET_AQUI`
(o mesmo valor do segredo `SCHED_SECRET`) e rode no SQL Editor. Ele liga a extensão
`pg_net` (que deixa o banco chamar uma URL) e agenda:

- `ig-scheduler` a cada 1 minuto (esvazia a fila e manda os passos com atraso);
- `ig-token-refresh` toda segunda-feira (renova o token).

## Passo 6: o app no Meta for Developers

1. Em developers.facebook.com, crie um app e adicione o produto
   **Instagram > API setup with Instagram login**.
2. Conecte a sua conta **profissional** (Business ou Creator) do Instagram.
3. Libere as permissões: `instagram_business_basic`, `instagram_business_manage_comments`,
   `instagram_business_manage_messages` (e `instagram_business_manage_insights` pras métricas).
4. Gere o **token** da conta (ele já vem long-lived, cerca de 60 dias). Coloque em `IG_ACCESS_TOKEN`.
5. Pegue o **id da conta**: abra
   `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=SEU_TOKEN`
   e use o valor de `user_id` em `IG_ACCOUNT_ID`.
6. No app do Instagram (celular), em Configurações > Mensagens, deixe ligado
   "Permitir acesso às mensagens" pra ferramentas conectadas.

## Passo 7: cadastrar o webhook no Meta

Na configuração de webhooks do produto Instagram:

1. **Callback URL:** a URL da `instagram-webhook` (passo 4).
2. **Verify token:** o mesmo valor do segredo `VERIFY_TOKEN`.
3. Clique em verificar e salvar.
4. **Assine os TRÊS campos:** `comments`, `messages` e `messaging_postbacks`.
   O `messaging_postbacks` é o que faz os botões da conversa funcionarem.

## Passo 8: publicar o painel

1. Preencha `frontend/config.js` com a `SUPABASE_URL` e a `SUPABASE_ANON_KEY`
   (Project Settings > API). A chave anônima pode ficar pública: quem tranca o banco é o RLS.
2. Publique a pasta `frontend` em qualquer host estático (ex: GitHub Pages: crie um
   repositório, suba os arquivos da pasta `frontend` e ative Pages em Settings > Pages).
3. Abra o endereço publicado e entre com o usuário do passo 2.

## Passo 9: testar de verdade

1. No painel, crie uma automação (palavra-chave, mensagem, botão) e deixe-a ativa.
2. Com uma **SEGUNDA conta** do Instagram, comente a palavra num post seu.
   Comentários da sua própria conta são ignorados de propósito.
3. Coloque o id dessa conta de teste em `TEST_IG_ACCOUNTS` pra ela poder testar várias vezes
   (senão vale a regra de 1 DM por pessoa a cada 24h).
4. Se algo não chegar, veja os logs em **Edge Functions > instagram-webhook > Logs** e a
   tabela `ig_deliveries` (cada envio fica registrado ali, com o motivo do erro).

## Passo 10: ligar a trava da assinatura

Quando tudo estiver funcionando, mude `APP_SECRET_ENFORCE` para `true`. Aí só requisições
assinadas pelo Meta são aceitas.

---

## Como a conversa é guardada (o campo `flow`)

Cada automação guarda a conversa inteira em `flow.steps`. A **Mensagem 1 é sempre o primeiro
item** da lista (o código pega o primeiro, não procura um id específico). Um botão tem OU
`next` (vai pra outro passo) OU `url` (abre um link). Botão sem os dois significa "encerrar"
e não é enviado.

```json
{
  "steps": [
    { "id": 1, "message": "Oi! Quer o material?", "buttons": [{ "title": "Quero", "next": 2 }] },
    { "id": 2, "message": "Prefere PDF ou vídeo?", "buttons": [
        { "title": "PDF", "url": "https://seusite.com/material.pdf" },
        { "title": "Vídeo", "next": 3 } ] },
    { "id": 3, "message": "Me manda seu e-mail que eu envio:", "collect": { "field": "email", "next": null } }
  ]
}
```

- **Teste A/B:** a Mensagem 1 pode ter `message_variants` (versões B, C, D). O webhook sorteia
  uma versão pra cada pessoa e grava qual foi em `ig_deliveries.variante` e `ig_leads.variante`.
- **"Um link":** a Mensagem 1 tem um botão com `url`. Uma etapa só: o toque abre o site.
- **"Continua a conversa":** o botão da Mensagem 1 tem `next` apontando pra Mensagem 2.

O botão que avança é enviado com o payload `STEP:idDaAutomacao:proximoPasso`; é ele que diz
ao webhook qual automação e qual passo mandar a seguir (então duas automações com o mesmo
texto de botão nunca se misturam).

Os botões vão **anexados** ao balão (button template). Se o Instagram recusar, o sistema
tenta como pílulas (quick reply) e por último como texto puro com o link escrito, pra a
mensagem nunca deixar de chegar.

---

## Regras e limites (pra não tomar bloqueio)

- **Opt-in sempre:** o sistema só responde quem comentou ou mandou mensagem. Nada de disparo
  em massa, nada de spam, nada de lista comprada.
- **1 por dia:** cada pessoa recebe no máximo 1 DM automática por comentário a cada 24h
  (as contas em `TEST_IG_ACCOUNTS` ignoram essa regra).
- **Freio de envio:** no máximo 6 por minuto, 60 por hora e 180 por dia (bem abaixo do teto
  do Instagram, que fica em torno de 200 a 300 respostas privadas por dia). O excesso espera
  na fila. Se o Instagram começar a bloquear (3 falhas duras seguidas), o disjuntor pausa os
  envios por 6 horas. Os tetos ficam na tabela `ig_send_budget` (dá pra ajustar lá).
- **Janela de 24h:** fora de uma interação recente não dá pra mandar DM. O comentário e o
  toque no botão abrem a janela. Antes da pessoa interagir, o Instagram só deixa mandar UMA
  mensagem (por isso, no modo "Continua a conversa", o arquivo vai junto com a Mensagem 2).
- **Token:** vence em cerca de 60 dias; o robô semanal renova sozinho. Acompanhe em
  `ig_token_status` (as Métricas avisam quando estiver perto de vencer).
- **Botões:** título com até 20 caracteres e no máximo 3 botões anexados por mensagem.
- **Comentários antigos:** a resposta privada a um comentário só vale por cerca de 7 dias.
- **Consultas:** o banco devolve no máximo 1000 linhas por requisição; pagine tabelas que crescem.

## Checklist do que preencher

- [ ] `frontend/config.js`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- [ ] Segredos: `IG_ACCESS_TOKEN`, `IG_ACCOUNT_ID`, `APP_SECRET`, `APP_SECRET_ENFORCE`,
      `VERIFY_TOKEN`, `GRAPH_API_VERSION`, `SCHED_SECRET`, `TEST_IG_ACCOUNTS`
- [ ] `04_agendamento.sql`: `SEU_PROJETO`, `SEU_SCHED_SECRET_AQUI`
- [ ] Usuário admin criado e cadastro público desligado
- [ ] Webhook com `comments`, `messages` e `messaging_postbacks` assinados
