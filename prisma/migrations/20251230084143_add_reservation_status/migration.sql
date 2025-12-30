/*
  Warnings:

  - The `status` column on the `reservations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('PENDIENTE', 'CONFIRMADA');

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "status",
ADD COLUMN     "status" "reservation_status" NOT NULL DEFAULT 'CONFIRMADA';
