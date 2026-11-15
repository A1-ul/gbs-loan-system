-- Generated from Prisma authoritative schema
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_ANALYST', 'LOAN_UNDERWRITER', 'COLLECTIONS', 'FIELD_OFFICER', 'CUSTOMER_SERVICE', 'RECEPTION', 'GUARANTOR_PORTAL', 'MEMBER_PORTAL', 'ACCOUNTANT', 'FINANCE_MANAGER', 'TREASURY', 'HUMAN_RESOURCE', 'LEGAL_DEPARTMENT', 'COMPLIANCE', 'INTERNAL_AUDIT', 'RISK_MANAGEMENT', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS', 'MARKETING', 'INVESTOR', 'BOARD_EXECUTIVE', 'MOBILE_STAFF', 'MANAGER', 'STAFF', 'COLLECTOR', 'MEMBER', 'GUARANTOR');


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


