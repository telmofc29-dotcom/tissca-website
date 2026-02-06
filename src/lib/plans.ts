export type PlanTier = 'free' | 'pro' | 'team';

export function isPro(plan?: PlanTier | null) {
  return plan === 'pro' || plan === 'team';
}

export function isTeam(plan?: PlanTier | null) {
  return plan === 'team';
}

export function formatPlanLabel(plan?: PlanTier | null) {
  switch (plan) {
    case 'pro':
      return 'Pro';
    case 'team':
      return 'Team';
    default:
      return 'Free';
  }
}
