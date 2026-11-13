-- GBS Enterprise Database - Security & Biometrics Audit Table
CREATE TABLE IF NOT EXISTS security_audit (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    event_type VARCHAR(100) NOT NULL, -- MFA_CHALLENGE, VOICE_VERIFICATION, TOKEN_REVOKED, UNRECOGNIZED_DEVICE
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(45),
    location_country VARCHAR(100),
    location_city VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, CRITICAL
    success BOOLEAN DEFAULT true,
    risk_score DECIMAL(5,2) DEFAULT 0.00,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON security_audit(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit(created_at);
