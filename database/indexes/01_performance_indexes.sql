-- Authoritative B-Tree & Unique Indexes
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


