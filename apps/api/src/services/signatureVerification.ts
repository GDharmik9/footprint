import crypto from 'crypto';
import { getSecret } from '../gcp.js';

/**
 * Validates the HMAC-SHA256 signature of a webhook request body.
 * Returns true if valid, or if no signature key is configured in secrets (allowing local development).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secretKeyName: string
): Promise<boolean> {
  const secretKey = await getSecret(secretKeyName);

  // If no secret key is configured in GCP/Env, allow bypass in local sandbox
  if (!secretKey) {
    console.warn(`Webhook Security: No secret key "${secretKeyName}" found. Skipping signature verification in sandbox mode.`);
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const bufferComputed = Buffer.from(computedSignature, 'hex');
    const bufferReceived = Buffer.from(signatureHeader, 'hex');

    if (bufferComputed.length !== bufferReceived.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferComputed, bufferReceived);
  } catch (err) {
    console.error(`Error verifying signature for secret "${secretKeyName}":`, err);
    return false;
  }
}
