-- CreateTable
CREATE TABLE "SheetDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheetDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetDraft_userId_idx" ON "SheetDraft"("userId");

-- CreateIndex
CREATE INDEX "SheetDraft_updatedAt_idx" ON "SheetDraft"("updatedAt");

-- AddForeignKey
ALTER TABLE "SheetDraft" ADD CONSTRAINT "SheetDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
