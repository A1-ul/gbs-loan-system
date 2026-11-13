-- GBS Enterprise Database - Authentication & Login Audit Table
CREATE TABLE IF NOT EXISTS login_audit (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    email_or_phone VARCHAR(100),
    auth_method VARCHAR(50), -- PASSWORD, VOICE_BIOMETRIC, OTP_SMS
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    failure_reason VARCHAR(255),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_attempted ON login_audit(attempted_at);
