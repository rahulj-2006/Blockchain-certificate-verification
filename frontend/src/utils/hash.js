/**
 * Generates a SHA-256 hash from a File object using the Web Crypto API.
 * This hashes the raw binary content of the file, not just its name or metadata.
 * @param {File} file - The file to hash.
 * @returns {Promise<string>} - The hex-encoded SHA-256 hash with '0x' prefix.
 */
export const hashFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `0x${hex}`;
};
