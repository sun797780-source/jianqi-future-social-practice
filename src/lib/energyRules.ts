export const ENERGY_RULES = {
  eraBadge: 8,
  pledgeBase: 3,
  max: 100,
} as const;

export function clampEnergy(value: number) {
  return Math.max(0, Math.min(ENERGY_RULES.max, Math.round(value)));
}

export function getPledgeEnergy(pledgeCount: number) {
  if (!Number.isFinite(pledgeCount) || pledgeCount <= 0) return 0;
  return Math.min(12, Math.floor(pledgeCount) * ENERGY_RULES.pledgeBase);
}

export function getBadgeEnergy(hasBadge: boolean) {
  return hasBadge ? 0 : ENERGY_RULES.eraBadge;
}
