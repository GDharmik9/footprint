export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'housing' | 'transport' | 'food';
  type: string;
  value: number;
  unit: string;
  impactKg: number;
  rewardLeaves: number;
}

export const COUNTRY_CONFIGS: Record<
  string,
  { name: string; numericOnly: boolean; pattern: string; placeholder: string; zipLength?: number }
> = {
  us: { name: 'United States', numericOnly: true, pattern: '^[0-9]{5}$', placeholder: 'Enter 5-digit ZIP code (e.g. 90210)', zipLength: 5 },
  in: { name: 'India', numericOnly: true, pattern: '^[0-9]{6}$', placeholder: 'Enter 6-digit PIN code (e.g. 110001)', zipLength: 6 },
  de: { name: 'Germany', numericOnly: true, pattern: '^[0-9]{5}$', placeholder: 'Enter 5-digit postal code (e.g. 10115)', zipLength: 5 },
  fr: { name: 'France', numericOnly: true, pattern: '^[0-9]{5}$', placeholder: 'Enter 5-digit postal code (e.g. 75001)', zipLength: 5 },
  ca: { name: 'Canada', numericOnly: false, pattern: '^[A-Za-z][0-9][A-Za-z]\\s?[0-9][A-Za-z][0-9]$', placeholder: 'Enter postal code (e.g. K1A 0B1)' },
  gb: { name: 'United Kingdom', numericOnly: false, pattern: '^[A-Za-z0-9\\s]{5,8}$', placeholder: 'Enter postal code (e.g. SW1A 1AA)' }
};

export function calculateLevel(leaves: number): number {
  if (leaves < 100) return 1;
  if (leaves < 250) return 2;
  if (leaves < 500) return 3;
  if (leaves < 1000) return 4;
  return 5 + Math.floor((leaves - 1000) / 1000);
}

export function generateRandomEcoName(): string {
  const adjectives = [
    'Eco', 'Green', 'Wild', 'Forest', 'Mountain', 'Leafy', 'Sunny', 'River',
    'Wind', 'Solar', 'Mossy', 'Fern', 'Pine', 'Cedar', 'Sage', 'Clover'
  ];
  const nouns = [
    'Ranger', 'Guardian', 'Seedling', 'Sprout', 'Wanderer', 'Champion', 'Warrior',
    'Friend', 'Birch', 'Willow', 'Lily', 'Lotus', 'Breeze', 'Acorn', 'Sapling'
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj} ${noun} #${num}`;
}

export interface AutoLocation {
  country: string;
  postalCode: string;
}

export async function detectIPLocation(): Promise<AutoLocation> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.postal && data.country_code) {
        return {
          country: data.country_code.toLowerCase(),
          postalCode: data.postal
        };
      }
    }
  } catch (e) {
    console.warn('IP Geolocation lookup failed, falling back to default location.', e);
  }
  return {
    country: 'us',
    postalCode: '90210'
  };
}
