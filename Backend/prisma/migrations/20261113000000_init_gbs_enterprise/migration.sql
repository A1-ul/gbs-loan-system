-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_ANALYST', 'LOAN_UNDERWRITER', 'COLLECTIONS', 'FIELD_OFFICER', 'CUSTOMER_SERVICE', 'RECEPTION', 'GUARANTOR_PORTAL', 'MEMBER_PORTAL', 'ACCOUNTANT', 'FINANCE_MANAGER', 'TREASURY', 'HUMAN_RESOURCE', 'LEGAL_DEPARTMENT', 'COMPLIANCE', 'INTERNAL_AUDIT', 'RISK_MANAGEMENT', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS', 'MARKETING', 'INVESTOR', 'BOARD_EXECUTIVE', 'MOBILE_STAFF', 'MANAGER', 'STAFF', 'COLLECTOR', 'MEMBER', 'GUARANTOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'AWAITING_APPROVAL', 'DEACTIVATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'ONGOING', 'PAID', 'OVERDUE', 'DEFAULTED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOMO', 'BANK_TRANSFER', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'AWAITING_APPROVAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SMS', 'EMAIL', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('PAYMENT_REMINDER', 'PAYMENT_DUE_TODAY', 'PAYMENT_DUE_WEEK', 'OVERDUE_ALERT', 'GUARANTOR_ALERT', 'LOAN_APPROVED', 'LOAN_DISBURSED', 'LOAN_REJECTED', 'OTP_VERIFICATION', 'SYSTEM_ALERT', 'MEETING_INVITE', 'TENANT_APPROVAL', 'TRIAL_COUNTDOWN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'DISBURSE', 'PAYMENT', 'EXPORT', 'USER_REGISTERED', 'USER_QUALIFICATION_VERIFIED', 'TENANT_ONBOARDED', 'TENANT_APPROVED', 'TENANT_REJECTED', 'VOICE_VERIFIED', 'FACIAL_VERIFIED', 'DELETION_REQUESTED', 'DELETION_APPROVED', 'SYSTEM_LOCK', 'SYSTEM_UNLOCK', 'BACKUP_CREATED', 'MIGRATION_EXECUTED');

-- CreateEnum
CREATE TYPE "SalaryStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollectorStatus" AS ENUM ('ONLINE', 'OFFLINE', 'ON_ROUTE', 'AT_LOCATION', 'IDLE');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('GPS_TRACKING', 'DATA_PROCESSING', 'MARKETING', 'GUARANTOR_AGREEMENT', 'PRIVACY_POLICY', 'TERMS_OF_SERVICE');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('PRODUCTION_LIVE', 'DEVELOPMENT_SEED', 'STAGING_TEST', 'MIGRATED_IMPORT');

-- CreateEnum
CREATE TYPE "EnvironmentTag" AS ENUM ('DEVELOPMENT', 'TEST', 'STAGING', 'PRODUCTION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "profile_picture" TEXT,
    "address" TEXT,
    "gps_latitude" DOUBLE PRECISION,
    "gps_longitude" DOUBLE PRECISION,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "facial_enrolled" BOOLEAN NOT NULL DEFAULT false,
    "facial_descriptor_hash" TEXT,
    "last_device_fingerprint" TEXT,
    "trusted_devices" JSONB,
    "qualification_verified" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_admin_id" TEXT,
    "deletion_requested" BOOLEAN NOT NULL DEFAULT false,
    "deletion_reason" TEXT,
    "deletion_approved_by_id" TEXT,
    "metadata" JSONB,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verification_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "status_before" TEXT NOT NULL,
    "status_after" TEXT NOT NULL,
    "is_qualified" BOOLEAN NOT NULL,
    "notes" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_fingerprint" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_backups" (
    "id" TEXT NOT NULL,
    "status" "BackupStatus" NOT NULL,
    "file_path" TEXT,
    "file_size" BIGINT,
    "cloud_path" TEXT,
    "checksum" TEXT,
    "triggered_by" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "user_id" TEXT NOT NULL,
    "member_number" TEXT NOT NULL,
    "ghana_card_number" TEXT,
    "ghana_card_verified" BOOLEAN NOT NULL DEFAULT false,
    "ghana_card_verified_at" TIMESTAMP(3),
    "date_of_birth" TIMESTAMP(3),
    "occupation" TEXT,
    "employer" TEXT,
    "monthly_income" DECIMAL(12,2),
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "credit_score" INTEGER NOT NULL DEFAULT 650,
    "kyc_status" TEXT NOT NULL DEFAULT 'PENDING',
    "registration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guarantors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "ghana_card_number" TEXT,
    "relationship" TEXT,
    "agreement_signed" BOOLEAN NOT NULL DEFAULT false,
    "agreement_signed_at" TIMESTAMP(3),
    "penalty_notify_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MICRO_LOAN',
    "min_amount" DECIMAL(12,2) NOT NULL DEFAULT 500,
    "max_amount" DECIMAL(12,2) NOT NULL DEFAULT 250000,
    "interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.0,
    "penalty_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.0,
    "min_term_months" INTEGER NOT NULL DEFAULT 3,
    "max_term_months" INTEGER NOT NULL DEFAULT 36,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "loan_number" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "loan_product_id" TEXT,
    "principal_amount" DECIMAL(12,2) NOT NULL,
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "penalty_rate" DECIMAL(5,2) NOT NULL,
    "term_months" INTEGER NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(12,2) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT,
    "risk_score" INTEGER,
    "application_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "disbursed_at" TIMESTAMP(3),
    "disbursed_by_id" TEXT,
    "due_date" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collateral_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "loan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "estimated_value" DECIMAL(12,2) NOT NULL,
    "document_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "verified_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collateral_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_guarantors" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "guarantor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_workflow_logs" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "from_status" "LoanStatus" NOT NULL,
    "to_status" "LoanStatus" NOT NULL,
    "performed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_workflow_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayment_schedules" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "installment_no" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "principal_due" DECIMAL(12,2) NOT NULL,
    "interest_due" DECIMAL(12,2) NOT NULL,
    "total_due" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repayment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_penalties" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "payment_ref" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "momo_transaction_id" TEXT,
    "momo_phone" TEXT,
    "bank_reference" TEXT,
    "receipt_number" TEXT,
    "collected_by_id" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "paid_at" TIMESTAMP(3),
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "user_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_salaries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "staff_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "bonuses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "status" "SalaryStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "paid_by_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_salaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "branch_id" TEXT,
    "user_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "assigned_zone" TEXT,
    "status" "CollectorStatus" NOT NULL DEFAULT 'OFFLINE',
    "last_latitude" DOUBLE PRECISION,
    "last_longitude" DOUBLE PRECISION,
    "last_speed" DOUBLE PRECISION,
    "last_location_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collector_location_logs" (
    "id" TEXT NOT NULL,
    "collector_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "status" "CollectorStatus" NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "is_offline_sync" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collector_location_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_visits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "collector_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "loan_number" TEXT,
    "visit_outcome" TEXT NOT NULL,
    "amount_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoom_meetings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "zoom_meeting_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "join_url" TEXT NOT NULL,
    "password" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "participants" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zoom_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "report_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "generated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health_logs" (
    "id" TEXT NOT NULL,
    "server_status" TEXT NOT NULL,
    "database_status" TEXT NOT NULL,
    "redis_status" TEXT NOT NULL,
    "uptime_seconds" BIGINT NOT NULL,
    "memory_usage_mb" DOUBLE PRECISION,
    "cpu_usage_percent" DOUBLE PRECISION,
    "last_backup_at" TIMESTAMP(3),
    "backup_status" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_records" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'KYC',
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by_id" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "case_code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "ticket_number" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "requester_phone" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WALK_IN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "investor_code" TEXT NOT NULL,
    "investor_name" TEXT NOT NULL,
    "email" TEXT,
    "committed_capital" DECIMAL(14,2) NOT NULL,
    "deployed_capital" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "annual_yield_rate" DECIMAL(5,2) NOT NULL DEFAULT 18.5,
    "returns_accrued" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "campaign_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS_OUTREACH',
    "target_segment" TEXT,
    "leads_count" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_approval_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_label" TEXT,
    "reason" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_MANAGER_APPROVAL',
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deletion_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualification_levels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualification_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_grades" (
    "id" TEXT NOT NULL,
    "grade_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_steps" (
    "id" TEXT NOT NULL,
    "salary_grade_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_bands" (
    "id" TEXT NOT NULL,
    "band_name" TEXT NOT NULL,
    "min_years" INTEGER NOT NULL,
    "max_years" INTEGER NOT NULL,
    "allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_salary_profiles" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "qualification_level_id" TEXT,
    "salary_grade_id" TEXT,
    "salary_step_id" TEXT,
    "service_band_id" TEXT,
    "years_of_service" INTEGER NOT NULL DEFAULT 0,
    "branch_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "responsibility_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "housing_transport_allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "performance_bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_computed_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_salary_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_increment_history" (
    "id" TEXT NOT NULL,
    "employee_salary_profile_id" TEXT NOT NULL,
    "previous_grade" TEXT,
    "new_grade" TEXT,
    "previous_step" INTEGER,
    "new_step" INTEGER,
    "previous_salary" DECIMAL(12,2) NOT NULL,
    "new_salary" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_increment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "voiceprint_hash" TEXT NOT NULL,
    "acoustic_signature" JSONB,
    "sample_rate" INTEGER NOT NULL DEFAULT 16000,
    "is_enrolled" BOOLEAN NOT NULL DEFAULT false,
    "passphrase_text" TEXT,
    "enrolled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_verification_logs" (
    "id" TEXT NOT NULL,
    "voice_profile_id" TEXT NOT NULL,
    "action_attempted" TEXT NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "transcription" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "access_level" TEXT NOT NULL DEFAULT 'LEAD_DEVELOPER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_secret" TEXT,
    "voiceprint_hash" TEXT,
    "facial_hash" TEXT,
    "allowed_ips" JSONB,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_sessions" (
    "id" TEXT NOT NULL,
    "developer_user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_audit_logs" (
    "id" TEXT NOT NULL,
    "developer_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_component" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lock_states" (
    "id" TEXT NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "lock_reason" TEXT,
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_lock_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_history" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "provider" TEXT NOT NULL DEFAULT 'render',
    "commit_sha" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DEPLOYED',
    "deployed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'HIGH',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ip_address" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "institution_id" TEXT,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "institution_type" TEXT NOT NULL DEFAULT 'MICROFINANCE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "onboarding_status" TEXT NOT NULL DEFAULT 'PENDING',
    "plan_tier" TEXT NOT NULL DEFAULT 'Enterprise',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "country" TEXT DEFAULT 'Ghana',
    "region" TEXT DEFAULT 'Greater Accra',
    "city" TEXT DEFAULT 'Accra',
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "registration_number" TEXT,
    "business_license_number" TEXT,
    "tin_number" TEXT,
    "logo_url" TEXT,
    "representative_name" TEXT,
    "representative_email" TEXT,
    "representative_phone" TEXT,
    "representative_role" TEXT,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT true,
    "approved_by_developer_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Accra',
    "sub_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sub_expiry" TIMESTAMP(3),
    "days_left" INTEGER NOT NULL DEFAULT 90,
    "alert_sent" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_messages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "senderType" TEXT NOT NULL DEFAULT 'DEVELOPER',
    "sender_name" TEXT NOT NULL DEFAULT 'GBS Developer Authority',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DISTRICT',
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geofence_radius" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT,
    "branch_name" TEXT NOT NULL DEFAULT 'Branch Location',
    "region" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "geofence_radius" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "is_hq" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "last_payment_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_jobs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "job_type" TEXT NOT NULL,
    "target_entity" TEXT NOT NULL DEFAULT 'MEMBERS',
    "file_name" TEXT,
    "column_mapping" JSONB,
    "imported_ids" JSONB,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "processed_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "rolled_back" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_log" JSONB,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_diagnostic_logs" (
    "id" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "description" TEXT NOT NULL,
    "stack_trace" TEXT,
    "recommended_fix" TEXT,
    "auto_fixed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_diagnostic_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_tenant_id_role_status_idx" ON "users"("tenant_id", "role", "status");

-- CreateIndex
CREATE INDEX "user_verification_logs_tenant_id_idx" ON "user_verification_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "user_verification_logs_user_id_idx" ON "user_verification_logs"("user_id");

-- CreateIndex
CREATE INDEX "user_verification_logs_admin_id_idx" ON "user_verification_logs"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_consents_user_id_consent_type_key" ON "user_consents"("user_id", "consent_type");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_backups_status_idx" ON "system_backups"("status");

-- CreateIndex
CREATE INDEX "system_backups_created_at_idx" ON "system_backups"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_number_key" ON "members"("member_number");

-- CreateIndex
CREATE INDEX "members_tenant_id_idx" ON "members"("tenant_id");

-- CreateIndex
CREATE INDEX "members_branch_id_idx" ON "members"("branch_id");

-- CreateIndex
CREATE INDEX "members_member_number_idx" ON "members"("member_number");

-- CreateIndex
CREATE UNIQUE INDEX "guarantors_user_id_key" ON "guarantors"("user_id");

-- CreateIndex
CREATE INDEX "guarantors_tenant_id_idx" ON "guarantors"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "loan_products_code_key" ON "loan_products"("code");

-- CreateIndex
CREATE INDEX "loan_products_tenant_id_idx" ON "loan_products"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_number_key" ON "loans"("loan_number");

-- CreateIndex
CREATE INDEX "loans_tenant_id_idx" ON "loans"("tenant_id");

-- CreateIndex
CREATE INDEX "loans_branch_id_idx" ON "loans"("branch_id");

-- CreateIndex
CREATE INDEX "loans_member_id_idx" ON "loans"("member_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_application_date_idx" ON "loans"("application_date");

-- CreateIndex
CREATE INDEX "loans_due_date_idx" ON "loans"("due_date");

-- CreateIndex
CREATE INDEX "collateral_items_tenant_id_idx" ON "collateral_items"("tenant_id");

-- CreateIndex
CREATE INDEX "collateral_items_loan_id_idx" ON "collateral_items"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "loan_guarantors_loan_id_guarantor_id_key" ON "loan_guarantors"("loan_id", "guarantor_id");

-- CreateIndex
CREATE INDEX "loan_workflow_logs_loan_id_idx" ON "loan_workflow_logs"("loan_id");

-- CreateIndex
CREATE INDEX "repayment_schedules_loan_id_idx" ON "repayment_schedules"("loan_id");

-- CreateIndex
CREATE INDEX "repayment_schedules_due_date_idx" ON "repayment_schedules"("due_date");

-- CreateIndex
CREATE INDEX "loan_penalties_loan_id_idx" ON "loan_penalties"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_ref_key" ON "payments"("payment_ref");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_loan_id_idx" ON "payments"("loan_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employee_id_key" ON "staff"("employee_id");

-- CreateIndex
CREATE INDEX "staff_tenant_id_idx" ON "staff"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_employee_id_idx" ON "staff"("employee_id");

-- CreateIndex
CREATE INDEX "staff_salaries_tenant_id_idx" ON "staff_salaries"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_salaries_status_idx" ON "staff_salaries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_salaries_staff_id_month_year_key" ON "staff_salaries"("staff_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "collectors_user_id_key" ON "collectors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "collectors_employee_id_key" ON "collectors"("employee_id");

-- CreateIndex
CREATE INDEX "collectors_tenant_id_idx" ON "collectors"("tenant_id");

-- CreateIndex
CREATE INDEX "collectors_employee_id_idx" ON "collectors"("employee_id");

-- CreateIndex
CREATE INDEX "collectors_status_idx" ON "collectors"("status");

-- CreateIndex
CREATE INDEX "collector_location_logs_collector_id_idx" ON "collector_location_logs"("collector_id");

-- CreateIndex
CREATE INDEX "collector_location_logs_recorded_at_idx" ON "collector_location_logs"("recorded_at");

-- CreateIndex
CREATE INDEX "customer_visits_tenant_id_idx" ON "customer_visits"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_visits_collector_id_idx" ON "customer_visits"("collector_id");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "zoom_meetings_zoom_meeting_id_key" ON "zoom_meetings"("zoom_meeting_id");

-- CreateIndex
CREATE INDEX "zoom_meetings_tenant_id_idx" ON "zoom_meetings"("tenant_id");

-- CreateIndex
CREATE INDEX "zoom_meetings_host_id_idx" ON "zoom_meetings"("host_id");

-- CreateIndex
CREATE INDEX "zoom_meetings_start_time_idx" ON "zoom_meetings"("start_time");

-- CreateIndex
CREATE INDEX "report_snapshots_tenant_id_idx" ON "report_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "report_snapshots_report_type_idx" ON "report_snapshots"("report_type");

-- CreateIndex
CREATE INDEX "report_snapshots_period_start_period_end_idx" ON "report_snapshots"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "system_health_logs_recorded_at_idx" ON "system_health_logs"("recorded_at");

-- CreateIndex
CREATE INDEX "document_records_tenant_id_idx" ON "document_records"("tenant_id");

-- CreateIndex
CREATE INDEX "document_records_entity_type_entity_id_idx" ON "document_records"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_cases_case_code_key" ON "compliance_cases"("case_code");

-- CreateIndex
CREATE INDEX "compliance_cases_tenant_id_idx" ON "compliance_cases"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_cases_category_status_idx" ON "compliance_cases"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_tenant_id_idx" ON "support_tickets"("tenant_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "investor_accounts_investor_code_key" ON "investor_accounts"("investor_code");

-- CreateIndex
CREATE INDEX "investor_accounts_tenant_id_idx" ON "investor_accounts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_campaigns_campaign_code_key" ON "marketing_campaigns"("campaign_code");

-- CreateIndex
CREATE INDEX "marketing_campaigns_tenant_id_idx" ON "marketing_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "deletion_approval_requests_tenant_id_idx" ON "deletion_approval_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "deletion_approval_requests_status_idx" ON "deletion_approval_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "qualification_levels_code_key" ON "qualification_levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "salary_grades_grade_code_key" ON "salary_grades"("grade_code");

-- CreateIndex
CREATE UNIQUE INDEX "salary_steps_salary_grade_id_step_number_key" ON "salary_steps"("salary_grade_id", "step_number");

-- CreateIndex
CREATE UNIQUE INDEX "service_bands_band_name_key" ON "service_bands"("band_name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_salary_profiles_staff_id_key" ON "employee_salary_profiles"("staff_id");

-- CreateIndex
CREATE INDEX "salary_increment_history_employee_salary_profile_id_idx" ON "salary_increment_history"("employee_salary_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_profiles_user_id_key" ON "voice_profiles"("user_id");

-- CreateIndex
CREATE INDEX "voice_verification_logs_voice_profile_id_idx" ON "voice_verification_logs"("voice_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "developer_users_username_key" ON "developer_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "developer_users_email_key" ON "developer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "developer_sessions_session_token_key" ON "developer_sessions"("session_token");

-- CreateIndex
CREATE INDEX "developer_sessions_developer_user_id_idx" ON "developer_sessions"("developer_user_id");

-- CreateIndex
CREATE INDEX "developer_audit_logs_developer_user_id_idx" ON "developer_audit_logs"("developer_user_id");

-- CreateIndex
CREATE INDEX "developer_audit_logs_created_at_idx" ON "developer_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "deployment_history_environment_created_at_idx" ON "deployment_history"("environment", "created_at");

-- CreateIndex
CREATE INDEX "security_alerts_tenant_id_idx" ON "security_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "security_alerts_resolved_created_at_idx" ON "security_alerts"("resolved", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_institution_id_key" ON "tenants"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenants_onboarding_status_idx" ON "tenants"("onboarding_status");

-- CreateIndex
CREATE INDEX "tenant_messages_tenant_id_idx" ON "tenant_messages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "branches_tenant_id_idx" ON "branches"("tenant_id");

-- CreateIndex
CREATE INDEX "branches_status_idx" ON "branches"("status");

-- CreateIndex
CREATE INDEX "tenant_locations_tenant_id_idx" ON "tenant_locations"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_locations_branch_id_idx" ON "tenant_locations"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "migration_jobs_tenant_id_idx" ON "migration_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "migration_jobs_status_idx" ON "migration_jobs"("status");

-- CreateIndex
CREATE INDEX "ai_diagnostic_logs_issue_type_idx" ON "ai_diagnostic_logs"("issue_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verification_logs" ADD CONSTRAINT "user_verification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verification_logs" ADD CONSTRAINT "user_verification_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_products" ADD CONSTRAINT "loan_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collateral_items" ADD CONSTRAINT "collateral_items_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_guarantors" ADD CONSTRAINT "loan_guarantors_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_guarantors" ADD CONSTRAINT "loan_guarantors_guarantor_id_fkey" FOREIGN KEY ("guarantor_id") REFERENCES "guarantors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_workflow_logs" ADD CONSTRAINT "loan_workflow_logs_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_schedules" ADD CONSTRAINT "repayment_schedules_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_penalties" ADD CONSTRAINT "loan_penalties_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_location_logs" ADD CONSTRAINT "collector_location_logs_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_visits" ADD CONSTRAINT "customer_visits_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zoom_meetings" ADD CONSTRAINT "zoom_meetings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_records" ADD CONSTRAINT "document_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_cases" ADD CONSTRAINT "compliance_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_accounts" ADD CONSTRAINT "investor_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deletion_approval_requests" ADD CONSTRAINT "deletion_approval_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_steps" ADD CONSTRAINT "salary_steps_salary_grade_id_fkey" FOREIGN KEY ("salary_grade_id") REFERENCES "salary_grades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_profiles" ADD CONSTRAINT "employee_salary_profiles_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_profiles" ADD CONSTRAINT "employee_salary_profiles_qualification_level_id_fkey" FOREIGN KEY ("qualification_level_id") REFERENCES "qualification_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_profiles" ADD CONSTRAINT "employee_salary_profiles_salary_grade_id_fkey" FOREIGN KEY ("salary_grade_id") REFERENCES "salary_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_profiles" ADD CONSTRAINT "employee_salary_profiles_salary_step_id_fkey" FOREIGN KEY ("salary_step_id") REFERENCES "salary_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_profiles" ADD CONSTRAINT "employee_salary_profiles_service_band_id_fkey" FOREIGN KEY ("service_band_id") REFERENCES "service_bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_increment_history" ADD CONSTRAINT "salary_increment_history_employee_salary_profile_id_fkey" FOREIGN KEY ("employee_salary_profile_id") REFERENCES "employee_salary_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_profiles" ADD CONSTRAINT "voice_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_verification_logs" ADD CONSTRAINT "voice_verification_logs_voice_profile_id_fkey" FOREIGN KEY ("voice_profile_id") REFERENCES "voice_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_sessions" ADD CONSTRAINT "developer_sessions_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "developer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_audit_logs" ADD CONSTRAINT "developer_audit_logs_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "developer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_messages" ADD CONSTRAINT "tenant_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_locations" ADD CONSTRAINT "tenant_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_locations" ADD CONSTRAINT "tenant_locations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

