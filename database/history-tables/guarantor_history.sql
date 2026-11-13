-- GBS Enterprise Database - Guarantor Engagement History Table
CREATE TABLE IF NOT EXISTS guarantor_history (
    id VARCHAR(36) PRIMARY KEY,
    guarantor_id VARCHAR(36) NOT NULL,
    loan_id VARCHAR(36) NOT NULL,
    member_id VARCHAR(36) NOT NULL,
    liability_amount DECIMAL(14,2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING_CONSENT, AGREED, RELEASED, INVOKED_DEFAULT
    signature_date TIMESTAMP WITH TIME ZONE,
    release_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guarantor_hist_guarantor ON guarantor_history(guarantor_id);
CREATE INDEX IF NOT EXISTS idx_guarantor_hist_loan ON guarantor_history(loan_id);
