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

module.exports = {
  removeKeyPrefixes,
  extractDeviceId
};
