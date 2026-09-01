/*
  Warnings:

  - A unique constraint covering the columns `[userId,employeeCode]` on the table `Operator` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Operator_employeeCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Operator_userId_employeeCode_key" ON "Operator"("userId", "employeeCode");
