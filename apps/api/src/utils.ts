export function calculateLevel(leaves: number): number {
  if (leaves < 100) return 1;
  if (leaves < 250) return 2;
  if (leaves < 500) return 3;
  if (leaves < 1000) return 4;
  return 5 + Math.floor((leaves - 1000) / 1000);
}

export function calculateLeavesAwarded(
  category: string,
  options: { transportMode?: string; dietType?: string; housingOption?: string }
): number {
  let leaves = 15;
  if (category === 'transport' && (options.transportMode === 'ev' || options.transportMode === 'transit')) {
    leaves += 15;
  } else if (category === 'food' && options.dietType === 'vegan') {
    leaves += 10;
  } else if (category === 'housing' && options.housingOption === 'solar') {
    leaves += 20;
  }
  return leaves;
}
