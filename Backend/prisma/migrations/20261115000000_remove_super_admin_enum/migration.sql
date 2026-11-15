-- Non-destructive migration: remove SUPER_ADMIN from UserRole enum cleanly while preserving all user rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'SUPER_ADMIN'
  ) THEN
    UPDATE "users"
    SET "role" = 'COMPANY_OWNER'
    WHERE "role"::text = 'SUPER_ADMIN';

    CREATE TYPE "UserRole_new" AS ENUM (
      'COMPANY_OWNER',
      'EXECUTIVE_MANAGEMENT',
      'REGIONAL_MANAGER',
      'BRANCH_MANAGER',
      'OPERATIONS_MANAGER',
      'LOAN_OFFICER',
      'SENIOR_CREDIT_OFFICER',
      'CREDIT_ANALYST',
      'LOAN_UNDERWRITER',
      'COLLECTIONS',
      'FIELD_OFFICER',
      'CUSTOMER_SERVICE',
      'RECEPTION',
      'GUARANTOR_PORTAL',
      'MEMBER_PORTAL',
      'ACCOUNTANT',
      'FINANCE_MANAGER',
      'TREASURY',
      'HUMAN_RESOURCE',
      'LEGAL_DEPARTMENT',
      'COMPLIANCE',
      'INTERNAL_AUDIT',
      'RISK_MANAGEMENT',
      'FRAUD_INVESTIGATION',
      'SECURITY_OPERATIONS',
      'MARKETING',
      'INVESTOR',
      'BOARD_EXECUTIVE',
      'MOBILE_STAFF',
      'MANAGER',
      'STAFF',
      'COLLECTOR',
      'MEMBER',
      'GUARANTOR'
    );

    ALTER TABLE "users"
      ALTER COLUMN "role" TYPE "UserRole_new"
      USING ("role"::text::"UserRole_new");

    DROP TYPE "UserRole";
    ALTER TYPE "UserRole_new" RENAME TO "UserRole";
  END IF;
END $$;
