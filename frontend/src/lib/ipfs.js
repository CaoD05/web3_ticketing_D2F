/**
 * Utility functions to fetch metadata from IPFS via Pinata gateway
 */

const CUSTOM_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || "https://indigo-brilliant-peafowl-826.mypinata.cloud/ipfs";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const IPFS_GATEWAY_FALLBACK = "https://ipfs.io/ipfs";

function toGatewayUrl(cidOrUrl, gatewayBase = PINATA_GATEWAY) {
  if (!cidOrUrl || typeof cidOrUrl !== "string") {
    return null;
  }

  if (cidOrUrl.startsWith("http")) {
    return cidOrUrl;
  }

  // Remove ipfs:// prefix if present
  const cid = cidOrUrl.startsWith("ipfs://") ? cidOrUrl.slice(7) : cidOrUrl;

  return `${gatewayBase}/${cid}`;
}

/**
 * Fault-tolerant JSON parser to handle slightly malformed metadata from IPFS
 */
function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("[IPFS] Standard JSON parse failed, attempting auto-repair...");
    
    try {
      // 1. Handle double-double quotes at start of values
      let repaired = text.replace(/":\s*""/g, '": "');
      
      // 2. Handle the specific FANTASY SHOW quote breakage
      // It has a quote inside the description that isn't escaped.
      // We look for " followed by a space or letter (common for internal quotes)
      // and NOT preceded by : (which would be a value start)
      // This is a heuristic fix.
      repaired = repaired.replace(/([^:])"(\s|\w)/g, '$1\\"$2');
      
      // 3. One more pass for any remaining "" at the start of values
      repaired = repaired.replace(/":\s*""/g, '": "');

      return JSON.parse(repaired);
    } catch (reE) {
      // Final desperate attempt: if it's just the description field, 
      // try to extract name/image via regex if JSON.parse still fails
      console.error("[IPFS] Auto-repair failed, using regex extraction:", reE.message);
      
      const nameMatch = text.match(/"name":\s*"([^"]+)"/);
      const imageMatch = text.match(/"image":\s*"([^"]+)"/);
      const descMatch = text.match(/"description":\s*""?([^"]+)/);

      if (nameMatch || imageMatch) {
        return {
          name: nameMatch ? nameMatch[1] : "Malformed Event",
          image: imageMatch ? imageMatch[1] : null,
          description: descMatch ? descMatch[1] : "Mô tả không khả dụng do lỗi định dạng dữ liệu."
        };
      }
      return null;
    }
  }
}

/**
 * Fetch JSON metadata from IPFS CID using Pinata gateway
 * @param {string} cidOrUrl - IPFS CID (e.g., "bafkrei...") or full URL
 * @returns {Promise<object|null>} Parsed JSON metadata or null on error
 */
export async function fetchIPFSMetadata(cidOrUrl) {
  if (!cidOrUrl || typeof cidOrUrl !== "string") {
    return null;
  }

  const urlCandidates = cidOrUrl.startsWith("http")
    ? [cidOrUrl]
    : [
        toGatewayUrl(cidOrUrl, CUSTOM_GATEWAY),
        toGatewayUrl(cidOrUrl, PINATA_GATEWAY),
        toGatewayUrl(cidOrUrl, IPFS_GATEWAY_FALLBACK)
      ];

  for (const url of urlCandidates) {
    try {
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      return safeParseJSON(text);
    } catch (error) {
      console.error("Error fetching IPFS metadata:", error.message);
    }
  }

  return null;
}

/**
 * Convert IPFS CID to full Pinata gateway URL
 * @param {string} cidOrUrl - IPFS CID or URL
 * @returns {string} Full URL to access via Pinata gateway
 */
export function cidToGatewayUrl(cidOrUrl) {
  if (!cidOrUrl) return null;

  return toGatewayUrl(cidOrUrl, CUSTOM_GATEWAY);
}

/**
 * Extract display values from event metadata JSON
 * @param {object} metadata - IPFS metadata object
 * @returns {object} Extracted metadata with title, description, image, etc.
 */
export function parseEventMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  // Handle image that might be a CID
  const imageValue = metadata.image || metadata.imageUrl || null;
  const imageUrl = imageValue ? cidToGatewayUrl(imageValue) : null;

  return {
    title: metadata.name || metadata.title || null,
    description: metadata.description || null,
    image: imageUrl,
    price: metadata.price || null,
    ticketPrice: metadata.ticketPrice || null,
    organizer: metadata.organizer || null,
    website: metadata.website || metadata.url || null,
    location: metadata.location || null,
    eventDate: metadata.date || metadata.eventDate || null,
    category: metadata.category || null,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    attributes: metadata.attributes || null,
  };
}
