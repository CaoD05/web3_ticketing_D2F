/**
 * Utility functions to fetch metadata from IPFS via Pinata gateway
 */

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const IPFS_GATEWAY_FALLBACK = "https://ipfs.io/ipfs";

function toGatewayUrl(cidOrUrl, gatewayBase = PINATA_GATEWAY) {
  if (!cidOrUrl || typeof cidOrUrl !== "string") {
    return null;
  }

  if (cidOrUrl.startsWith("http")) {
    return cidOrUrl;
  }

  return `${gatewayBase}/${cidOrUrl}`;
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
    : [toGatewayUrl(cidOrUrl, PINATA_GATEWAY), toGatewayUrl(cidOrUrl, IPFS_GATEWAY_FALLBACK)];

  for (const url of urlCandidates) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`IPFS fetch failed (${response.status}): ${url}`);
        continue;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching IPFS metadata:", error.message);
    }
    return null;

  }
}

/**
 * Convert IPFS CID to full Pinata gateway URL
 * @param {string} cidOrUrl - IPFS CID or URL
 * @returns {string} Full URL to access via Pinata gateway
 */
export function cidToGatewayUrl(cidOrUrl) {
  if (!cidOrUrl) return null;

  return toGatewayUrl(cidOrUrl, PINATA_GATEWAY);
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
