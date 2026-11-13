-- GBS Enterprise v3.0 Upgrades Migration
-- Adds GPS address + hidden flags on users/members/guarantors/staff,
-- LoanWorkflowLog actor/audit snapshot, ZoomMeeting target roles,
-- ReportSnapshot weekly/monthly/yearly periods, Tenant branding & 1-month trial + multi-tier subscriptions,
-- StaffAttendance clock-in/out, CctvCamera mobile links, AccountingAuditRecord, and StaffBroadcastMessage.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "gps_address" TEXT,
  ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "members"
  ADD COLUMN IF NOT EXISTS "gps_address" TEXT,
  ADD COLUMN IF NOT EXISTS "gps_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "gps_longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "guarantors"
  ADD COLUMN IF NOT EXISTS "gps_address" TEXT,
  ADD COLUMN IF NOT EXISTS "gps_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "gps_longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "loan_workflow_logs"
  ADD COLUMN IF NOT EXISTS "performed_by_name" TEXT,
  ADD COLUMN IF NOT EXISTS "performed_by_role" TEXT,
  ADD COLUMN IF NOT EXISTS "audit_snapshot" JSONB;

ALTER TABLE "staff"
  ADD COLUMN IF NOT EXISTS "gps_address" TEXT,
  ADD COLUMN IF NOT EXISTS "gps_latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "gps_longitude" DOUBLE PRECISION;

ALTER TABLE "zoom_meetings"
  ADD COLUMN IF NOT EXISTS "host_name" TEXT,
  ADD COLUMN IF NOT EXISTS "target_scope" TEXT DEFAULT 'ALL_STAFF',
  ADD COLUMN IF NOT EXISTS "participant_roles" JSONB;

ALTER TABLE "report_snapshots"
  ADD COLUMN IF NOT EXISTS "period_type" TEXT,
  ADD COLUMN IF NOT EXISTS "period_label" TEXT;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "company_name_updated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "subscription_months" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "is_lifetime" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tenants" ALTER COLUMN "days_left" SET DEFAULT 30;

CREATE TABLE IF NOT EXISTS "staff_attendances" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "user_id" TEXT NOT NULL,
  "staff_id" TEXT,
  "work_date" TEXT NOT NULL,
  "clock_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clock_out_at" TIMESTAMP(3),
  "duration_minutes" INTEGER,
  "clock_in_latitude" DOUBLE PRECISION,
  "clock_in_longitude" DOUBLE PRECISION,
  "clock_in_gps_address" TEXT,
  "clock_out_latitude" DOUBLE PRECISION,
  "clock_out_longitude" DOUBLE PRECISION,
  "clock_out_gps_address" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CLOCKED_IN',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_attendances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "staff_attendances_tenant_id_idx" ON "staff_attendances"("tenant_id");
CREATE INDEX IF NOT EXISTS "staff_attendances_user_id_work_date_idx" ON "staff_attendances"("user_id", "work_date");

CREATE TABLE IF NOT EXISTS "cctv_cameras" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "branch_id" TEXT,
  "name" TEXT NOT NULL,
  "camera_location" TEXT,
  "stream_url" TEXT NOT NULL,
  "mobile_link_url" TEXT,
  "pairing_code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ONLINE',
  "added_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cctv_cameras_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cctv_cameras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "cctv_cameras_tenant_id_idx" ON "cctv_cameras"("tenant_id");

CREATE TABLE IF NOT EXISTS "accounting_audit_records" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "auditor_id" TEXT NOT NULL,
  "auditor_name" TEXT,
  "audit_period" TEXT NOT NULL,
  "total_principal_disbursed" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_interest_expected" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_repaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_outstanding" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_penalties" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "cash_in_hand" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "momo_float" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "bank_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "expected_ledger_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "actual_ledger_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "variance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discrepancies_found" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "findings" TEXT,
  "submitted_to_owner" BOOLEAN NOT NULL DEFAULT true,
  "owner_reviewed_at" TIMESTAMP(3),
  "owner_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accounting_audit_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounting_audit_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "accounting_audit_records_tenant_id_idx" ON "accounting_audit_records"("tenant_id");
CREATE INDEX IF NOT EXISTS "accounting_audit_records_status_idx" ON "accounting_audit_records"("status");

CREATE TABLE IF NOT EXISTS "staff_broadcast_messages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "sender_user_id" TEXT NOT NULL,
  "sender_name" TEXT NOT NULL,
  "sender_role" TEXT NOT NULL,
  "target_scope" TEXT NOT NULL DEFAULT 'ALL_STAFF',
  "recipient_user_ids" JSONB,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "read_by_user_ids" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_broadcast_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_broadcast_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "staff_broadcast_messages_tenant_id_idx" ON "staff_broadcast_messages"("tenant_id");

