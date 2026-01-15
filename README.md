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
### Modelagem do banco de dados
<img width="845" height="332" alt="image" src="https://github.com/user-attachments/assets/ca6f4656-9040-4b9e-a5af-ee96bffb2637" />

## Decisões Técnicas

- Node.js e NestJS: Foram utilizados pela minha familiaridade, o que me permitiu focar na aplicação e cumprimento de requisitos. Além disso, a existência das bibliotecas prisma para uso em ORM, Schedule para fazer agendamento de jobs e axios para realizar chamadas HTTP a API's de fácil integração ao NestJS torna o framework extremamente equipado para lidar com o desafio apresentado. Se houver necessidade de implementação de um front-end, a integração do projeto já existente se torna bem mais fácil para integrar com front-end JavaScript também.
- Docker: A escolha do docker se deu por motivos da facilidade da persistência do banco de dados, além de tornar o projeto mais fácil de rodar em máquinas de diferentes sistemas operacionais, gerando menos conflitos.
- PostgresSQL: Utilizado por ser um banco relacional amplamente adotado e robousto, além da ORM prisma já estar configurada para utilização do mesmo.
- Teste automatizado Jest: Por já ser integrado ao NestJS e garantir mais confiabilidade ao código.

## Possíveis Melhorias

- Melhor padronização: O código poderia ser mais refinado, com melhor organização das funções, variáveis com nomes padronizados e um banco de dados mais otimizado. Algumas colunas do banco possuem nome em inglês e outras em português, não havendo uma decisão forte para padronizar o código. Na chamada do relatório por período, as datas de inicio e fim contam a partir da hora 00:00 do dia, excluindo a data de fim do período.
- Relatórios comparativos: O cliente até o momento só pode buscar relatórios de cada moeda, uma informação importante que ele poderia ter seria um comparativo dos valores e do crescimento dos valores da cada moeda.
- Informações mais estudadas: Como alguém que não tem muito conhecimento em criptomoedas, posso não ter revelado as informações de forma mais intuitiva ou interessante para aqueles que buscam esses tipos de relatórios. Com conhecimento maior na área, poderia ter gerado uma API mais útil para os entusiastas utilizarem.
- Código mais pensado em utilização contínua: O relatório é mais visível para quantidades não tão grande de dados coletados. Se ele fosse estruturado pensando mais em utilização em um longo período de tempo, soluções como rotação das entradas e paginação poderiam ter sido pensadas e implementadas.
- Documentação mais detalhada: Apesar de existir um README explicando o funcionamento geral, uma documentação mais aprofundada dos endpoints e do formato das respostas poderia facilitar o uso da API por outros desenvolvedores.

### Se esse job precisasse processar dados de 1.000 ativos a cada 5 minutos, o que você mudaria na arquitetura?

- Processamento paralelo: Necessário para manter a consistência da chegada de dados, o que é essencial para quem investe em criptomoedas. Poderia-se utilizar também uma fila de processamento.
- Controle mais sofisticado de quantidade de chamadas: Mesmo com um plano pago de acesso à API, existe limite na quantidade de chamadas que podem ser feitas por minuto, então um algoritmo que garanta que as chamadas para gerar uma API consistente nunca ultrapassem o limite seria necessário.
- Tratamento de erros mais robusto: Com o fluxo de chegada de informações sendo bem mais acelerado, a chance de algum erro de conflito ou de sincronização de jobs aumenta bastante. Sendo também uma plataforma que funciona tecnicamente em tempo real, é preciso que exista um sistema de tratamento de erros que lide com múltiplas possibilidades de problemas e consiga contorná-los antes que as informações da API percam sua relevância com o tempo.
- Estruturação do banco de dados: Com a grande quantidade de entradas no banco de dados, mais campos seriam necessários para filtrar as informações relevantes para os clientes. Além disso, a publicação do banco de forma segura deveria ser feita para a garantia de que os dados não seriam perdidos.
- Separação mais clara de responsabilidades: Com o crescimento do sistema, seria interessante separar melhor o que é responsabilidade do job de coleta e o que é responsabilidade da API de leitura, evitando que uma parte impacte diretamente a outra.


   
