export interface CreationCostBounds {
  minCost: number;
  maxCost: number;
  currentScore: number;
}

export function calcCreationCost(
  currentScore: number,
  settingMinScore: number = 50,
  settingMaxScore: number = 5000,
): CreationCostBounds {
  const minCost = Math.max(Math.ceil(currentScore * 0.05), settingMinScore);
  const maxCost = Math.min(currentScore, settingMaxScore);
  return { minCost, maxCost, currentScore };
}

export function validateCreationCost(
  amount: number,
  bounds: CreationCostBounds,
): string | null {
  if (amount < bounds.minCost) {
    return `최소 ${bounds.minCost.toLocaleString()}점 이상 입력해야 합니다.`;
  }
  if (amount > bounds.currentScore) {
    return `보유 점수보다 큰 금액을 입력할 수 없습니다.`;
  }
  if (amount > bounds.maxCost) {
    return `최대 ${bounds.maxCost.toLocaleString()}점까지 가능합니다.`;
  }
  return null;
}
