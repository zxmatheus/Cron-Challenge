# Desafio Técnico – Job Agendado (Cron)

Este repositório foi desenvolvido como parte de um desafio técnico.

O objetivo é construir um serviço que execute um **job agendado (cron)** a cada 5 minutos, colete preços históricos da API pública da **CoinGecko**, persista os dados em banco de dados e **exponha relatórios por meio de uma API**.

Atualmente, o serviço coleta dados das seguintes criptomoedas:
- Bitcoin
- Ethereum
- Binance Coin (BNB)
- Solana

Os relatórios expostos pela API incluem:
- Histórico de preços
- Preço mínimo e data do mínimo
- Preço máximo e data do máximo
- Preço médio
- Variação percentual no período

---

## Requisitos para rodar o projeto

- Node.js (com npm): https://nodejs.org/en/download
- Docker: https://www.docker.com/get-started/  
  *(ou um banco PostgreSQL local, se preferir rodar sem Docker)*

---

## Como rodar o projeto utilizando o Docker

1. Clone o repositório:
   ```bash
   git clone https://github.com/zxmatheus/Cron-Challenge.git
   cd Cron-Challenge
    ```
2. Baixe as dependências do projeto:
   ``` bash
   npm install
   ```
3. Crie um arquivo .env na raiz do projeto com o seguinte conteúdo:
   ``` env
   DATABASE_URL=postgresql://postgres:postgres@db:5432/prices

   ```
4. Suba os contêineres do docker: 
    ``` bash
   docker compose up -d
    ```
5. Execute as migrações do banco de dados:
    ``` bash
     npx prisma migrate deploy
    ```
6. Inicie a aplicação:
    ``` bash
     npm run start:dev
    ```
