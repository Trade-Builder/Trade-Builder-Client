import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Creates a JWT token for Upbit API authentication
 * @param {string} accessKey - Upbit Access Key
 * @param {string} secretKey - Upbit Secret Key
 * @param {object} queryParams - Query parameters object (will be converted to query string and hashed)
 * @returns {Promise<string>} JWT token
 */
export async function createUpbitJWT(accessKey, secretKey, queryParams = null) {
  const payload = {
    access_key: accessKey,
    nonce: uuidv4(),
  };

  // If query parameters exist, create SHA512 hash
  if (queryParams) {
    const query = new URLSearchParams(
      Object.entries(queryParams).sort(([a], [b]) => a.localeCompare(b))
    ).toString();

    const hash = crypto.createHash('sha512');
    const queryHash = hash.update(query, 'utf-8').digest('hex');

    payload.query_hash = queryHash;
    payload.query_hash_alg = 'SHA512';
  }

  const secret = new TextEncoder().encode(secretKey);
  const jwtToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);

  return jwtToken;
}
