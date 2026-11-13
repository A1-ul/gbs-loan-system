-- GBS Enterprise Database - Financial Transaction Audit Table
CREATE TABLE IF NOT EXISTS transaction_audit (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    loan_id VARCHAR(36),
    member_id VARCHAR(36),
    amount DECIMAL(14,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- MOMO, BANK_TRANSFER, CASH
    action VARCHAR(50) NOT NULL, -- INITIATED, APPROVED, REJECTED, DISBURSED, REFUNDED
    authorized_by VARCHAR(36),
    provider_reference VARCHAR(100),
    momo_phone VARCHAR(20),
    bank_account VARCHAR(50),
    ledger_status VARCHAR(50) DEFAULT 'BALANCED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trans_audit_loan ON transaction_audit(loan_id);
CREATE INDEX IF NOT EXISTS idx_trans_audit_member ON transaction_audit(member_id);
CREATE INDEX IF NOT EXISTS idx_trans_audit_created ON transaction_audit(created_at);
