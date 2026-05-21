const ogs = require("open-graph-scraper");
const { ethers } = require("ethers");

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const IPFS_GATEWAY_FALLBACK = "https://ipfs.io/ipfs";

/**
 * toWeiString — Chuẩn hóa giá trị sang chuỗi Wei (uint256)
 */
function toWeiString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return null;
    return trimmed;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      return null;
    }
    return String(value);
  }

  try {
    const asString = value.toString();
    if (!/^\d+$/.test(asString)) return null;
    return asString;
  } catch {
    return null;
  }
}

/**
 * mapPriceFields — Gắn thêm priceEth vào object record
 */
function mapPriceFields(record, priceWei) {
  if (!priceWei) {
    return {
      ...record,
      priceWei: null,
      priceEth: null,
    };
  }

  return {
    ...record,
    priceWei,
    priceEth: ethers.formatEther(priceWei),
  };
}

/**
 * buildMetaUrlCandidates — Tạo danh sách URL IPFS từ CID hoặc URL
 */
function buildMetaUrlCandidates(metaURL) {
  if (!metaURL || typeof metaURL !== "string") {
    return [];
  }

  const trimmed = metaURL.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("http")) {
    return [trimmed];
  }

  // Remove ipfs:// prefix if present
  const cid = trimmed.startsWith("ipfs://") ? trimmed.slice(7) : trimmed;

  return [`${PINATA_GATEWAY}/${cid}`, `${IPFS_GATEWAY_FALLBACK}/${cid}`];
}

/**
 * normalizeImageCid — Làm sạch CID từ URL hoặc ipfs://
 */
function normalizeImageCid(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("ipfs://")) {
    return trimmed.slice("ipfs://".length);
  }

  if (trimmed.startsWith("http")) {
    const marker = "/ipfs/";
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex >= 0) {
      return trimmed.slice(markerIndex + marker.length);
    }
  }

  return trimmed;
}

/**
 * scrapeImageFromLink — Cào ảnh Open Graph từ URL bên ngoài
 */
async function scrapeImageFromLink(url) {
  try {
    if (!url || typeof url !== "string") {
      return null;
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      console.warn(`[metadataHelper] URL không hợp lệ: ${url}`);
      return null;
    }

    const options = {
      url: normalizedUrl,
      timeout: 10000, 
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

    return null;
  } catch (error) {
    console.error(`[metadataHelper] ❌ Lỗi khi cào metadata từ ${url}:`, error.message);
    return null;
  }
}

module.exports = { 
  scrapeImageFromLink,
  buildMetaUrlCandidates,
  normalizeImageCid,
  toWeiString,
  mapPriceFields
};
