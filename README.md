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
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

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
Agora de 5 em 5 minutos, ao aparecer a mensagem "Coletando preços..." no log, a extração dos dados atuais de cada moeda estará sendo feita.
   
A API estará disponível em:
 ```
http://localhost:3000

 ```
### Exemplos de chamadas

**GET**

- `http://localhost:3000/prices/btc`  
  Retorna o relatório e histórico de preços do **Bitcoin** durante todo o período coletado.

- `http://localhost:3000/prices/eth`  
  Retorna o relatório e histórico de preços do **Ethereum** durante todo o período coletado.

- `http://localhost:3000/prices/sol`  
  Retorna o relatório e histórico de preços da **Solana** durante todo o período coletado.

- `http://localhost:3000/prices/bnb`  
  Retorna o relatório e histórico de preços da **Binance Coin** durante todo o período coletado.

- `http://localhost:3000/prices/btc?from=2025-12-31&to=2026-02-01`  
  Retorna o relatório e histórico de preços do **Bitcoin** filtrado para o período de janeiro de 2026.

