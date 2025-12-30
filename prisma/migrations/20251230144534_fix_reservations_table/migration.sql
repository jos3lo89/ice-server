/*
  Warnings:

  - You are about to drop the column `reservation_date` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `reservation_time` on the `reservations` table. All the data in the column will be lost.
  - You are about to alter the column `duration_hours` on the `reservations` table. The data in that column could be lost. The data in that column will be cast from `Decimal(3,1)` to `Integer`.
  - Added the required column `created_by` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_datetime` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reservation_datetime` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Made the column `client_phone` on table `reservations` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "reservation_status" ADD VALUE 'CANCELADA';

-- DropIndex
DROP INDEX "idx_reservations_date";

-- DropIndex
DROP INDEX "idx_reservations_table";

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "reservation_date",
DROP COLUMN "reservation_time",
ADD COLUMN     "cancel_reason" VARCHAR(500),
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "confirmed_by" UUID,
ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "end_datetime" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "reservation_datetime" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "client_phone" SET NOT NULL,
ALTER COLUMN "duration_hours" SET DEFAULT 2,
ALTER COLUMN "duration_hours" SET DATA TYPE INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDIENTE';

-- CreateIndex
CREATE INDEX "reservations_reservation_datetime_idx" ON "reservations"("reservation_datetime");

-- CreateIndex
CREATE INDEX "reservations_table_id_status_idx" ON "reservations"("table_id", "status");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
