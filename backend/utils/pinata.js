const PINATA_API_URL = "https://api.pinata.cloud";
const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Upload file buffer to Pinata
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Name for the file in Pinata
 * @param {string} mimeType - MIME type of the file
 */
async function uploadFileToIPFS(fileBuffer, fileName, mimeType) {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT is not configured in environment variables.");
  }

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append("file", blob, fileName);

  // Add metadata for better Pinata dashboard management
  if (fileName) {
    formData.append("pinataMetadata", JSON.stringify({
      name: fileName
    }));
  }

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Pinata upload failed: ${errorData.error || response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

/**
 * Upload JSON object to Pinata
 * @param {object} jsonObject - The JSON data to pin
 * @param {string} name - Optional name for the JSON in Pinata
 */
async function uploadJSONToIPFS(jsonObject, name) {
  if (!PINATA_JWT) {
    throw new Error("PINATA_JWT is not configured in environment variables.");
  }

  // Use Pinata recommended structure for metadata support
  const body = {
    pinataContent: jsonObject,
  };

  if (name) {
    body.pinataMetadata = {
      name: name
    };
  }

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Pinata JSON upload failed: ${errorData.error || response.statusText}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}

module.exports = {
  uploadFileToIPFS,
  uploadJSONToIPFS,
};
