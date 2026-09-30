import axios from "axios";
import * as cheerio from "cheerio";

export const scrapeAmazonProduct = async (url) => {
  try {
    // Generate a random User-Agent to help avoid blocking
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36"
    ];
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const response = await axios.get(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      },
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // STEP 2: Detect CAPTCHA / Bot block and throw error so cron retries instead of saving empty data
    if (typeof html === "string") {
      const pageTitle = $("title").text().toLowerCase();
      if (
        html.includes("validateCaptcha") ||
        html.includes("api-services-support@amazon.com") ||
        html.includes("Type the characters you see in this image") ||
        pageTitle.includes("robot check")
      ) {
        throw new Error("Amazon CAPTCHA / Bot block detected");
      }
    }

    // 1. Extract ASIN (first try URL, then hidden inputs, then page details)
    let asin = null;
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (asinMatch) {
      asin = asinMatch[1];
    } else {
      asin = $('#ASIN').val() || $('input[name="ASIN"]').val() || $('th:contains("ASIN")').next('td').text().trim();
    }

    // STEP 3: Expand BSR Extraction to cover all Amazon layouts (Tech Specs, Detail Bullets, Product Facts)
    let bsrCategory = null;
    let bsrSubcategory = null;

    let bsrText = "";
    const bsrSelectors = [
      '#SalesRank',
      '#detailBullets_feature_div li:contains("Best Sellers Rank")',
      '#detailBulletsWrapper_feature_div li:contains("Best Sellers Rank")',
      'th:contains("Best Sellers Rank") + td',
      '#prodDetails th:contains("Best Sellers Rank") + td',
      'tr:contains("Best Sellers Rank") td',
      'li:contains("Best Sellers Rank")',
      'div[id*="detailBullets"] li:contains("Best Sellers Rank")',
      '.product-facts-detail:contains("Best Sellers Rank")'
    ];

    for (const sel of bsrSelectors) {
      const el = $(sel);
      if (el.length > 0) {
        const text = el.text().replace(/\s+/g, ' ').trim();
        if (text.includes('#')) {
          bsrText = text;
          break;
        }
      }
    }

    // Fallback: search whole page body text for Best Sellers Rank pattern
    if (!bsrText) {
      const bodyText = $('body').text().replace(/\s+/g, ' ');
      const fallbackMatch = bodyText.match(/Best Sellers Rank\s*:?\s*([^;.]+?(?:\([^)]*\))?[^;.]*?in\s+[A-Za-z0-9&', -]+)/i);
      if (fallbackMatch) {
        bsrText = fallbackMatch[0];
      }
    }

    if (bsrText) {
      const cleanBsrText = bsrText.replace(/\s+/g, ' ').trim();
      // Match all instances of "#<number>" (e.g., #34,132 or #87)
      const ranks = cleanBsrText.match(/#([\d,]+)/g);
      if (ranks && ranks.length > 0) {
        bsrCategory = ranks[0].replace(/[#,]/g, '').trim();
        if (ranks.length > 1) {
          bsrSubcategory = ranks[1].replace(/[#,]/g, '').trim();
        }
      }
    }

    // STEP 3: Expand Rating Extraction (popover title, data-hook, star icons)
    let rating = null;
    const ratingCandidates = [
      $('#acrPopover').attr('title'),
      $('[data-hook="rating-out-of-text"]').first().text(),
      $('#averageCustomerReviews .a-icon-star .a-icon-alt').first().text(),
      $('#acrPopover .a-icon-star .a-icon-alt').first().text(),
      $('.a-icon-star .a-icon-alt').first().text(),
      $('span.a-icon-alt:contains("out of")').first().text(),
    ];

    for (const cand of ratingCandidates) {
      if (cand) {
        const ratingMatch = cand.match(/([\d.]+)\s*(?:out of|\/|\s*stars)/i);
        if (ratingMatch) {
          const parsed = parseFloat(ratingMatch[1]);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) {
            rating = parsed;
            break;
          }
        }
      }
    }

    // STEP 3: Expand Review Count Extraction (customer review link, total-review-count, ratings text)
    let reviewCount = null;
    const reviewCandidates = [
      $('#acrCustomerReviewText').first().text(),
      $('[data-hook="total-review-count"]').first().text(),
      $('#acrCustomerReviewLink').first().text(),
      $('#averageCustomerReviews [data-hook="total-review-count"]').first().text(),
    ];

    for (const cand of reviewCandidates) {
      if (cand) {
        const reviewMatch = cand.replace(/,/g, '').match(/([\d]+)/);
        if (reviewMatch) {
          const parsed = parseInt(reviewMatch[1], 10);
          if (!isNaN(parsed) && parsed >= 0) {
            reviewCount = parsed;
            break;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        asin,
        bsrCategory,
        bsrSubcategory,
        rating,
        reviewCount
      }
    };
  } catch (error) {
    console.error(`Error scraping Amazon URL ${url}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};
