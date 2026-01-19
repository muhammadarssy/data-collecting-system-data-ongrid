const config = require('../config/config');

/**
 * Remove configured prefixes from object keys
 * @param {Object} obj - Object with keys to clean
 * @returns {Object} - Object with cleaned keys
 */
function removeKeyPrefixes(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const prefixes = config.messageFormatting.keyPrefixes;
  const cleanedObj = {};

  for (const [key, value] of Object.entries(obj)) {
    let cleanKey = key;

    // Try to remove each prefix
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        cleanKey = key.substring(prefix.length);
        break; // Stop after first match
      }
    }

    // Recursively clean nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleanedObj[cleanKey] = removeKeyPrefixes(value);
    } else {
      cleanedObj[cleanKey] = value;
    }
  }

  return cleanedObj;
}

/**
 * Extract deviceId from payload by finding first key without prefix
 * @param {Object} payload - Original payload
 * @returns {string|null} - Detected deviceId
 */
function extractDeviceId(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const prefixes = config.messageFormatting.keyPrefixes;
  
  // Find first key that has a prefix
  for (const key of Object.keys(payload)) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        // Return the prefix without the trailing underscore
        return prefix.replace(/_$/, '');
      }
    }
  }

  return null;
}

/**
 * Pluralize collection name based on rules:
 * - If ends with a digit: keep as is (ehub1 → ehub1)
 * - If does not end with digit: add 's' (harvest → harvests, ehub → ehubs)
 * @param {string} collectionName - Original collection name
 * @returns {string} - Pluralized collection name
 */
function pluralizeCollectionName(collectionName) {
  if (!collectionName || typeof collectionName !== 'string') {
    return collectionName;
  }

  // Check if the last character is a digit
  const lastChar = collectionName.charAt(collectionName.length - 1);
  
  if (/\d/.test(lastChar)) {
    // Ends with a digit, keep as is
    return collectionName;
  } else {
    // Does not end with digit, add 's'
    return collectionName + 's';
  }
}

module.exports = {
  removeKeyPrefixes,
  extractDeviceId,
  pluralizeCollectionName
};
