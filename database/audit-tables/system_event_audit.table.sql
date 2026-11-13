-- GBS Enterprise Database - System Events & Developer Control Audit Table
CREATE TABLE IF NOT EXISTS system_event_audit (
    id VARCHAR(36) PRIMARY KEY,
    event_category VARCHAR(100) NOT NULL, -- SYSTEM_LOCK, BACKUP_TRIGGERED, DISASTER_RECOVERY, MIGRATION
    initiated_by VARCHAR(36) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PENDING, COMPLETED, FAILED
    affected_components JSONB,
    details JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_event_cat ON system_event_audit(event_category);
CREATE INDEX IF NOT EXISTS idx_sys_event_time ON system_event_audit(occurred_at);
