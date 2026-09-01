-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('AVAILABLE', 'USED');

-- CreateTable
CREATE TABLE "TagLoop" (
    "id" TEXT NOT NULL,
    "startTag" TEXT NOT NULL,
    "endTag" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagLoop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "status" "TagStatus" NOT NULL DEFAULT 'AVAILABLE',
    "loopId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TagLoop_userId_idx" ON "TagLoop"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_tagNumber_key" ON "Tag"("tagNumber");

-- CreateIndex
CREATE INDEX "Tag_status_idx" ON "Tag"("status");

-- CreateIndex
CREATE INDEX "Tag_loopId_idx" ON "Tag"("loopId");

-- AddForeignKey
ALTER TABLE "TagLoop" ADD CONSTRAINT "TagLoop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_loopId_fkey" FOREIGN KEY ("loopId") REFERENCES "TagLoop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
