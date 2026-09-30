import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { scrapeAmazonProduct } from "../services/amazonScraper.service.js";
import { getIstDate } from "../repositories/amazonBatch.repository.js";

const prisma = new PrismaClient();

// Run every minute
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    // Convert to Indian Standard Time (IST, UTC+05:30)
    const istNow = getIstDate(now);
    const hours = String(istNow.getUTCHours()).padStart(2, "0");
    const minutes = String(istNow.getUTCMinutes()).padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;

    // Find settings that match the current time in IST
    const settings = await prisma.amazonAnalyticsSetting.findMany({
      where: { time: currentTime },
    });

    let userIdsToRun = settings.map(s => s.userId);

    // If it is 11:00 AM IST, also run for all users who don't have a setting
    if (currentTime === "11:00") {
      const allUsersWithProducts = await prisma.amazonAnalytics.findMany({
        select: { userId: true },
        distinct: ['userId'],
      });
      
      const allSettings = await prisma.amazonAnalyticsSetting.findMany({
        select: { userId: true }
      });
      const usersWithSettings = new Set(allSettings.map(s => s.userId));

      for (const p of allUsersWithProducts) {
        if (!usersWithSettings.has(p.userId) && !userIdsToRun.includes(p.userId)) {
          userIdsToRun.push(p.userId);
        }
      }
    }

    if (userIdsToRun.length === 0) return;

    console.log(`[Amazon Scraper Cron] Triggered at ${currentTime} IST for ${userIdsToRun.length} users`);

    for (const userId of userIdsToRun) {
      // Get all analytics products for this user
      const products = await prisma.amazonAnalytics.findMany({
        where: { userId: userId },
      });

      console.log(`[Amazon Scraper Cron] Found ${products.length} products for user ${userId}`);

      // Process products in batches to speed up fetching
      const BATCH_SIZE = 5;
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (product) => {
          if (!product.url) return;

          let result;
          const maxRetries = 2;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`[Amazon Scraper Cron] Scraping: ${product.url} (Attempt ${attempt}/${maxRetries})`);
            result = await scrapeAmazonProduct(product.url);

            if (result.success && result.data && (result.data.asin || result.data.rating || result.data.bsrCategory)) {
              break; // Valid data found, exit the retry loop
            } else if (attempt < maxRetries) {
              console.log(`[Amazon Scraper Cron] Incomplete/null data returned for ${product.url}. Retrying in 3 seconds...`);
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }

          if (result && result.success && result.data && (result.data.asin || result.data.rating || result.data.bsrCategory)) {
            const istProductNow = getIstDate(new Date());
            const updateData = {
              lastScrapedAt: istProductNow,
            };
            if (result.data.asin) updateData.asin = result.data.asin;
            if (result.data.bsrCategory) updateData.bsrCategory = result.data.bsrCategory;
            if (result.data.bsrSubcategory) updateData.bsrSubcategory = result.data.bsrSubcategory;
            if (result.data.rating !== null && result.data.rating !== undefined) updateData.rating = result.data.rating;
            if (result.data.reviewCount !== null && result.data.reviewCount !== undefined) updateData.reviewCount = result.data.reviewCount;

            await prisma.amazonAnalytics.update({
              where: { id: product.id },
              data: updateData,
            });

            const yyyy = istProductNow.getUTCFullYear();
            const mm = String(istProductNow.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(istProductNow.getUTCDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;

            // Use newly scraped values with existing product data as fallback
            const resolvedAsin = result.data.asin || product.asin;
            const resolvedClothingRank = result.data.bsrCategory || product.bsrCategory;
            const resolvedRank = result.data.bsrSubcategory || product.bsrSubcategory;
            const resolvedReviews = (result.data.reviewCount !== null && result.data.reviewCount !== undefined)
              ? result.data.reviewCount
              : product.reviewCount;
            const resolvedRating = (result.data.rating !== null && result.data.rating !== undefined)
              ? result.data.rating
              : product.rating;

            await prisma.amazonAnalyticsHistory.upsert({
              where: {
                amazonAnalyticsId_dateString: {
                  amazonAnalyticsId: product.id,
                  dateString: dateString,
                }
              },
              update: {
                ...(resolvedAsin ? { asin: resolvedAsin } : {}),
                ...(resolvedClothingRank ? { clothingRank: resolvedClothingRank } : {}),
                ...(resolvedRank ? { rank: resolvedRank } : {}),
                ...(resolvedReviews !== null && resolvedReviews !== undefined ? { reviews: resolvedReviews } : {}),
                ...(resolvedRating !== null && resolvedRating !== undefined ? { rating: resolvedRating } : {}),
              },
              create: {
                amazonAnalyticsId: product.id,
                userId: product.userId,
                sellerSku: product.sku,
                dateString: dateString,
                asin: resolvedAsin,
                clothingRank: resolvedClothingRank,
                rank: resolvedRank,
                reviews: resolvedReviews,
                rating: resolvedRating,
              }
            });

            console.log(`[Amazon Scraper Cron] Successfully updated product ${product.sku} and added to history`);
          } else {
            console.error(`[Amazon Scraper Cron] Failed to scrape or returned null data for ${product.url} after ${maxRetries} attempts`);
          }
        }));

        // Add a small delay between batches to avoid hammering Amazon too quickly
        if (i + BATCH_SIZE < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Cleanup records older than 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      await prisma.amazonAnalyticsHistory.deleteMany({
        where: {
          userId: userId,
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });
      console.log(`[Amazon Scraper Cron] Cleaned up records older than 30 days for user ${userId}`);
    }
  } catch (error) {
    console.error("[Amazon Scraper Cron] Error running cron job:", error);
  }
});
