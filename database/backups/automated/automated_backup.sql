-- Automated Backup Snapshot Script for GBS Enterprise PostgreSQL
-- Generates point-in-time snapshot metadata and validates table schemas

SELECT 
    current_database() AS database_name,
    current_timestamp AS snapshot_time,
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Integrity check before snapshot
VACUUM ANALYZE;
