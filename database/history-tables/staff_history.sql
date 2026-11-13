-- GBS Enterprise Database - Staff Employment & Role History Table
CREATE TABLE IF NOT EXISTS staff_history (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    salary DECIMAL(12,2),
    status VARCHAR(50) NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,
    reason_for_change TEXT,
    modified_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_hist_staff ON staff_history(staff_id);
