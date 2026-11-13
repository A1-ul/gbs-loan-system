-- GBS LOAN MANAGEMENT SYSTEM - Database Performance Indexes
-- PostgreSQL High Performance Indexes

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON "User"("tenantId", "role");
CREATE INDEX IF NOT EXISTS idx_loans_borrower_status ON "Loan"("borrowerId", "status");
CREATE INDEX IF NOT EXISTS idx_loans_tenant_status ON "Loan"("tenantId", "status");
CREATE INDEX IF NOT EXISTS idx_payments_loan_status ON "Payment"("loanId", "status");
CREATE INDEX IF NOT EXISTS idx_payments_momo_tx ON "Payment"("momoTransactionId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON "AuditLog"("userId", "action");
CREATE INDEX IF NOT EXISTS idx_gps_logs_collector_time ON "CollectorGPSLog"("collectorId", "recordedAt");
