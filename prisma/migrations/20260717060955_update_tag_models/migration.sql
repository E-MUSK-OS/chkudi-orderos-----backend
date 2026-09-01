/*
  Warnings:

  - A unique constraint covering the columns `[userId,tagNumber]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endNumber` to the `TagLoop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prefix` to the `TagLoop` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startNumber` to the `TagLoop` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Tag_tagNumber_key";

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TagLoop" ADD COLUMN     "endNumber" INTEGER NOT NULL,
ADD COLUMN     "prefix" TEXT NOT NULL,
ADD COLUMN     "startNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_tagNumber_key" ON "Tag"("userId", "tagNumber");

-- CreateIndex
CREATE INDEX "TagLoop_prefix_idx" ON "TagLoop"("prefix");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
