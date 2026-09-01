-- CreateTable
CREATE TABLE "VMSScan" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT,
    "fileSize" INTEGER,
    "duration" INTEGER,
    "operatorId" TEXT,
    "cameraName" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VMSScan_pkey" PRIMARY KEY ("id")
);
