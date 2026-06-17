import { getSecret } from '../gcp.js';
import crypto from 'crypto';

export interface ShopifyDiscountResult {
  success: boolean;
  couponCode: string;
}

/**
 * Generates a dynamic discount coupon code via the Shopify Admin API.
 * Uses stored Admin API credentials or falls back to a sandbox/simulated code.
 */
export async function generateShopifyDiscountCode(
  userId: string,
  sponsorName: string,
  costLeaves: number
): Promise<ShopifyDiscountResult> {
  const shopifyAccessToken = await getSecret('SHOPIFY_ACCESS_TOKEN');
  const shopifyShopName = await getSecret('SHOPIFY_SHOP_NAME');

  const prefix = sponsorName.toUpperCase().replace(/\s+/g, '-');
  const uniqueSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const generatedCode = `${prefix}-${costLeaves}-${uniqueSuffix}`;

  if (!shopifyAccessToken || !shopifyShopName) {
    console.log(`Shopify API: Credentials missing. Simulating sandbox coupon generation: ${generatedCode}`);
    return {
      success: true,
      couponCode: generatedCode
    };
  }

  try {
    const priceRuleId = await getSecret('SHOPIFY_PRICE_RULE_ID') || 'default-price-rule-id';
    const url = `https://${shopifyShopName}.myshopify.com/admin/api/2024-04/price_rules/${priceRuleId}/discount_codes.json`;

    console.log(`Shopify API: Generating dynamic discount code ${generatedCode} for price rule ${priceRuleId}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        discount_code: {
          code: generatedCode
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Shopify API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    return {
      success: true,
      couponCode: data.discount_code?.code || generatedCode
    };
  } catch (err) {
    console.warn(`Shopify API dynamic code generation failed. Falling back to offline fallback code:`, err);
    return {
      success: true,
      couponCode: generatedCode
    };
  }
}
