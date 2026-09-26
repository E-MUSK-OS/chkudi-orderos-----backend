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

    // 1. Extract ASIN (first try URL, then page)
    let asin = null;
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (asinMatch) {
      asin = asinMatch[1];
    } else {
      asin = $('#ASIN').val() || $('th:contains("ASIN")').next('td').text().trim();
    }

    // 2. Extract Best Sellers Rank
    let bsrCategory = null;
    let bsrSubcategory = null;
    
    // Look for Best Sellers Rank table/list
    const bsrText = $('th:contains("Best Sellers Rank")').next('td').text() 
      || $('#SalesRank').text() 
      || $('li:contains("Best Sellers Rank")').text();

    if (bsrText) {
      const cleanBsrText = bsrText.replace(/\s+/g, ' ').trim();
      
      // Match all instances of "#<number>" (e.g., #34,132 or #87)
      const ranks = cleanBsrText.match(/#([\d,]+)/g);
      if (ranks && ranks.length > 0) {
        bsrCategory = ranks[0].replace(/[#,]/g, ''); // Extract 34132
        if (ranks.length > 1) {
          bsrSubcategory = ranks[1].replace(/[#,]/g, ''); // Extract 87
        }
      }
    }

    // 3. Extract Rating
    let rating = null;
    const ratingText = $('#acrPopover').attr('title') || $('.a-icon-star .a-icon-alt').first().text();
    if (ratingText) {
      const ratingMatch = ratingText.match(/([\d.]+)\s*out of/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }
    }

    // 4. Extract Review Count
    let reviewCount = null;
    const reviewText = $('#acrCustomerReviewText').text() || $('#acrCustomerReviewLink').text();
    if (reviewText) {
      const reviewMatch = reviewText.replace(/,/g, '').match(/([\d]+)/);
      if (reviewMatch) {
        reviewCount = parseInt(reviewMatch[1], 10);
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
