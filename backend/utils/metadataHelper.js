const ogs = require("open-graph-scraper");

/**
 * scrapeImageFromLink — Cào ảnh Open Graph từ URL bên ngoài
 *
 * Nhận vào một URL, trả về URL ảnh og:image nếu tìm thấy.
 * Trả về null nếu không tìm được hoặc có lỗi.
 *
 * @param {string} url - URL cần cào metadata
 * @returns {Promise<string|null>} URL ảnh hoặc null
 */
async function scrapeImageFromLink(url) {
  try {
    // Kiểm tra URL hợp lệ
    if (!url || typeof url !== "string") {
      return null;
    }

    // Thêm protocol nếu thiếu
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate URL format
    try {
      new URL(normalizedUrl);
    } catch {
      console.warn(`[metadataHelper] URL không hợp lệ: ${url}`);
      return null;
    }

    const options = {
      url: normalizedUrl,
      timeout: 10000, // 10 giây timeout
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
    };

    const { result } = await ogs(options);

    if (result.success && result.ogImage && result.ogImage.length > 0) {
      const imageUrl = result.ogImage[0].url;
      console.log(`[metadataHelper] ✅ Tìm thấy og:image: ${imageUrl}`);
      return imageUrl;
    }

    console.log(`[metadataHelper] ⚠️ Không tìm thấy og:image cho: ${url}`);
    return null;
  } catch (error) {
    console.error(`[metadataHelper] ❌ Lỗi khi cào metadata từ ${url}:`, error.message);
    return null;
  }
}

module.exports = { scrapeImageFromLink };
