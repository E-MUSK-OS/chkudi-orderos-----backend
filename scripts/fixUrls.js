import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const scans = await prisma.vMSScan.findMany();
  for (const scan of scans) {
    let changed = false;
    let videoUrl = scan.videoUrl;
    let thumbnailUrl = scan.thumbnailUrl;

    if (videoUrl && videoUrl.startsWith("http://localhost:5000")) {
      videoUrl = videoUrl.replace("http://localhost:5000/api/v1", "");
      changed = true;
    }

    if (thumbnailUrl && thumbnailUrl.startsWith("http://localhost:5000")) {
      thumbnailUrl = thumbnailUrl.replace("http://localhost:5000/api/v1", "");
      changed = true;
    }

    if (changed) {
      await prisma.vMSScan.update({
        where: { id: scan.id },
        data: { videoUrl, thumbnailUrl },
      });
      console.log(`Updated scan ${scan.id}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
