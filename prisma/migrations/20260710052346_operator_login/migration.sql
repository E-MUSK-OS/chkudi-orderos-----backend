/*
  Warnings:

  - A unique constraint covering the columns `[employeeCode]` on the table `Operator` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `Operator` table without a default value. This is not possible if the table is not empty.
  - Made the column `employeeCode` on table `Operator` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Operator" ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "employeeCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Operator_employeeCode_key" ON "Operator"("employeeCode");
