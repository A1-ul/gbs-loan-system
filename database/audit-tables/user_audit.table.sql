-- GBS Enterprise Database - User Account Life Cycle Audit Table
CREATE TABLE IF NOT EXISTS user_audit (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, ROLE_ASSIGNED, PASSWORD_RESET, LOCKED, DELETED
    modified_by VARCHAR(36),
    old_role VARCHAR(50),
    new_role VARCHAR(50),
    status_change VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_audit_user ON user_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_action ON user_audit(action);
