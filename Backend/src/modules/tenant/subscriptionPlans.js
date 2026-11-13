/**
 * GBS Enterprise Subscription Plan Catalog
 * Workflow: Developer approves institution -> 1-Month Free Trial (30 days)
 * Thereafter institution selects: 3 Months, 6 Months, 9 Months, 12 Months, or Lifetime.
 */

const SUBSCRIPTION_PLANS = {
  TRIAL_1M: {
    code: 'TRIAL_1M',
    label: '1-Month Free Trial',
    months: 1,
    days: 30,
    isLifetime: false,
    priceGhs: 0,
    tier: 'TRIAL',
    description: 'Complimentary 30-day full-platform evaluation upon Developer approval.',
  },
  PLAN_3M: {
    code: 'PLAN_3M',
    label: '3 Months Plan',
    months: 3,
    days: 90,
    isLifetime: false,
    priceGhs: 1500,
    tier: 'GROWTH',
    description: 'Quarterly institutional subscription (90 days full access).',
  },
  PLAN_6M: {
    code: 'PLAN_6M',
    label: '6 Months Plan',
    months: 6,
    days: 180,
    isLifetime: false,
    priceGhs: 2700,
    tier: 'PROFESSIONAL',
    description: 'Semi-annual institutional subscription (180 days full access).',
  },
  PLAN_9M: {
    code: 'PLAN_9M',
    label: '9 Months Plan',
    months: 9,
    days: 270,
    isLifetime: false,
    priceGhs: 3800,
    tier: 'ENTERPRISE',
    description: 'Three-quarter institutional subscription (270 days full access).',
  },
  PLAN_12M: {
    code: 'PLAN_12M',
    label: '12 Months Annual Plan',
    months: 12,
    days: 365,
    isLifetime: false,
    priceGhs: 4800,
    tier: 'ANNUAL',
    description: 'Full-year institutional license (365 days full access).',
  },
  LIFETIME: {
    code: 'LIFETIME',
    label: 'Lifetime License',
    months: null,
    days: 36500,
    isLifetime: true,
    priceGhs: 15000,
    tier: 'LIFETIME',
    description: 'Permanent non-expiring institutional license with lifetime access.',
  },
};

const ALIAS_MAP = {
  '1M': 'TRIAL_1M',
  'TRIAL': 'TRIAL_1M',
  'TRIAL_1M': 'TRIAL_1M',
  '3M': 'PLAN_3M',
  'PLAN_3M': 'PLAN_3M',
  '6M': 'PLAN_6M',
  'PLAN_6M': 'PLAN_6M',
  '9M': 'PLAN_9M',
  'PLAN_9M': 'PLAN_9M',
  '12M': 'PLAN_12M',
  'PLAN_12M': 'PLAN_12M',
  'ANNUAL': 'PLAN_12M',
  'LIFETIME': 'LIFETIME',
};

const TENANT_SELECTABLE_PLANS = [
  SUBSCRIPTION_PLANS.PLAN_3M,
  SUBSCRIPTION_PLANS.PLAN_6M,
  SUBSCRIPTION_PLANS.PLAN_9M,
  SUBSCRIPTION_PLANS.PLAN_12M,
  SUBSCRIPTION_PLANS.LIFETIME,
];

function resolveSubscriptionPlan(planCodeOrDays, fallbackDays = 30) {
  if (typeof planCodeOrDays === 'string' && planCodeOrDays.trim()) {
    const key = ALIAS_MAP[planCodeOrDays.trim().toUpperCase()];
    if (key && SUBSCRIPTION_PLANS[key]) {
      const plan = SUBSCRIPTION_PLANS[key];
      const subExpiry = plan.isLifetime
        ? null
        : new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000);
      return { ...plan, subExpiry };
    }
  }

  const parsedDays = parseInt(planCodeOrDays, 10);
  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : fallbackDays;
  const matchedByDays = Object.values(SUBSCRIPTION_PLANS).find((p) => !p.isLifetime && p.days === days);
  if (matchedByDays) {
    return {
      ...matchedByDays,
      subExpiry: new Date(Date.now() + matchedByDays.days * 24 * 60 * 60 * 1000),
    };
  }

  return {
    code: days === 30 ? 'TRIAL_1M' : `CUSTOM_${days}D`,
    label: days === 30 ? '1-Month Free Trial' : `${days}-Day Subscription`,
    months: Math.max(1, Math.round(days / 30)),
    days,
    isLifetime: false,
    priceGhs: 0,
    tier: days <= 30 ? 'TRIAL' : 'CUSTOM',
    description: `Custom ${days}-day institutional cycle.`,
    subExpiry: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  };
}

module.exports = {
  SUBSCRIPTION_PLANS,
  TENANT_SELECTABLE_PLANS,
  resolveSubscriptionPlan,
};

