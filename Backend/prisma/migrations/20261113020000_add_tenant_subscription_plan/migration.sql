-- Add explicit subscription_plan column to tenants for TRIAL_1M, PLAN_3M, PLAN_6M, PLAN_9M, PLAN_12M, LIFETIME
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "subscription_plan" TEXT DEFAULT 'TRIAL_1M';

