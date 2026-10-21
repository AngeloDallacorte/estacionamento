# Estacionamento ULBRA Torres

Sistema web para controle de entradas e saídas do estacionamento da ULBRA Torres.

## Equipe

- Angelo
- Dimitri
- José Paulo

## Como rodar localmente

É necessário ter Node.js e npm instalados. Na raiz do projeto, execute:

```bash
npm run dev
```

O script usa `npx serve .` para servir os arquivos estáticos. Abra no navegador o endereço informado pelo comando. Não abra `index.html` diretamente como arquivo, pois os módulos JavaScript do projeto serão carregados por HTTP.

## Configuração do Supabase

O projeto usa Supabase. Configure a URL do projeto e uma chave pública `anon` ou `publishable` em `js/config.js`. Nunca coloque a chave `service_role` no repositório.