-- AlterEnum
ALTER TYPE "order_status" ADD VALUE 'EN_PAGO_DIVIDIDO';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "quantity_paid" INTEGER NOT NULL DEFAULT 0;
