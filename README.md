# Estacionamento ULBRA Torres

Sistema web para controle de entradas e saídas do estacionamento da ULBRA Torres.

## Equipe

- Angelo
- Dimitri
- José Paulo

## Como rodar localmente

É necessário ter Node.js e npm instalados. Na raiz do projeto, execute:

```bash
npx serve .
```

Abra no navegador o endereço informado pelo comando. Não abra `index.html` diretamente como arquivo, pois os módulos JavaScript do projeto serão carregados por HTTP.

## Configuração do Supabase

O projeto usa Supabase. Configure a URL do projeto e a chave pública `anon` em `js/config.js` antes de conectar o front ao Supabase. Nunca coloque a chave `service_role` no repositório.