-- CreateTable
CREATE TABLE "moeda" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "moedaPreco" TEXT NOT NULL,
    "hora" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moeda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "moeda_nome_moedaPreco_hora_key" ON "moeda"("nome", "moedaPreco", "hora");
