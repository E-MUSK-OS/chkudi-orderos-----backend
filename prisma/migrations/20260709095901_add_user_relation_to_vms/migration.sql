/*
  Warnings:

  - You are about to drop the column `operatorId` on the `VMSScan` table. All the data in the column will be lost.
  - Added the required column `userId` to the `VMSScan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VMSScan" DROP COLUMN "operatorId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "VMSScan_userId_idx" ON "VMSScan"("userId");

-- AddForeignKey
ALTER TABLE "VMSScan" ADD CONSTRAINT "VMSScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
