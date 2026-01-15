# Desafio Técnico – Job Agendado (Cron)

Este repositório foi desenvolvido como parte de um desafio técnico.

O objetivo é construir um serviço que execute um **job agendado (cron)** a cada 5 minutos, colete preços históricos da API pública da **CoinGecko**, persista os dados em banco de dados e **exponha relatórios por meio de uma API**. O serviço foi desenvolvido através do framework NestJS da plataforma Node.js.

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

---

## Funcionamento do Job

Duas bibliotecas foram essenciais na construção do job:
- Schedule, para poder realizar o agendamento do job
- axios, para fazer chamadas à API externa, possibilitando a extração dos dados

Em ordem cronológica, assim funciona o job:
1. Define-se o intervalo de 5 minutos para a coleta de dados da API pela linha `@Cron(CronExpression.EVERY_5_MINUTES)`
2. axios faz chamada pelos preços atuais de moedas na API, filtrando utilizando os ids das moedas e pegando o valor em dolar.
   ``` ts
   const { data } = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'bitcoin,ethereum,solana,binancecoin', // dessa forma são os ids na plataforma da coingecko
            vs_currencies: 'usd', // filtrando preços em dolar
          },
        },
      );
   ```
3. Para cada uma das moedas, cria-se um entrada na tabela de moedas do banco de dados.
   ``` ts
    const ultimoPreco = await this.prisma.preco.findFirst({
      // Pega o preço mais recente da moeda contido no banco de dados
      where: { moedaId: moeda.id },
      orderBy: { dataDoValor: 'desc' },
    });

    if (ultimoPreco && ultimoPreco.valor.equals(valor)) {
      // Se o preço atual for igual ao preço mais recente, retorna, para evitar duplicação
      return;
    }
   ```
4. À cada intervalo, compara-se o preço anterior coletado para cada moeda com o coletado atualmente, para evitar duplicidade no histórico.
   ``` ts
    const ultimoPreco = await this.prisma.preco.findFirst({
      // Pega o preço mais recente da moeda contido no banco de dados
      where: { moedaId: moeda.id },
      orderBy: { dataDoValor: 'desc' },
    });

    if (ultimoPreco && ultimoPreco.valor.equals(valor)) {
      // Se o preço atual for igual ao preço mais recente, retorna, para evitar duplicação
      return;
    }
   ```
5. Se o preço tiver alterado, faz inserção na tabela de preços associado ao id da moeda correspondente.
   ``` ts
    await this.prisma.preco.create({
      // Gera instância do preço da moeda em dólares
      data: {
        moedaId: moeda.id,
        valor,
        dataDoValor: new Date(),
      },
    });
   ```
6. Para chamar a API do relatório, o cliente envia como parâmetro o símbolo da moeda e opcionalmente o período desejado.
   ``` ts
   @Get(':symbol')
   async getPrices(
     @Param('symbol') symbol: string,
     @Query('from') from?: string, // essa parte permite adicionar período em data no request, podendo ser o começo, o fim ou ambos
     @Query('to') to?: string,
   ) {
     return this.pricesService.getPricesWithReport(symbol, from, to);
   }
   ```
7. Função que gera o relatório filtra os preços pelo período (se esse for enviado).
   ``` ts
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const precos = await this.prisma.preco.findMany({
      where: {
        moedaId: moeda.id,
        ...(fromDate || toDate
          ? {
              dataDoValor: {
                ...(fromDate && { gte: fromDate }),
                ...(toDate && { lte: toDate }),
              }, // Filtrando preços pelo período desejado
            }
          : {}),
      },
      orderBy: { dataDoValor: 'asc' },
    });
   ```
8. Calcula-se máximo, mínimo, média e variação percentual dos preços para inclusão no relatório
   ``` ts
    let min = precos[0];
    let max = precos[0];
    const first = precos[0].valor.toNumber();
    const last = precos[precos.length - 1].valor.toNumber();
    let sum = 0;
    for (const preco of precos) {
      if (preco.valor.lessThan(min.valor)) min = preco;
      if (preco.valor.greaterThan(max.valor)) max = preco;
      sum += preco.valor.toNumber();
    }

    const average = sum / precos.length;
    const variationPercent = ((last - first) / first) * 100;
   ```
9. Retorna-se o relatório da moeda selecionada.
   ``` ts
   return {
         // retorno do relatório
         asset: {
           name: moeda.nome,
           symbol: moeda.symbol,
         },
         period: {
           from: fromDate ?? null,
           to: toDate ?? null,
         },
         summary: {
           min: {
             value: min.valor,
             date: min.dataDoValor,
           },
           max: {
             value: max.valor,
             date: max.dataDoValor,
           },
           average,
           variationPercent,
         },
         history: precos.map((p) => ({
           value: p.valor,
           date: p.dataDoValor,
         })),
       };
   ```
   
