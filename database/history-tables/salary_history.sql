-- GBS Enterprise Database - Salary & Payroll Historical Ledger Table
CREATE TABLE IF NOT EXISTS salary_history (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL,
    allowances DECIMAL(12,2) DEFAULT 0.00,
    deductions DECIMAL(12,2) DEFAULT 0.00,
    net_salary DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PAID',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salary_hist_staff ON salary_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_salary_hist_period ON salary_history(year, month);
