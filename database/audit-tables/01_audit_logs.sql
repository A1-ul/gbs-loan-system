-- Immutable Audit & Verification Tables
-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "data_source" "DataSource" NOT NULL DEFAULT 'PRODUCTION_LIVE',
    "environment_tag" "EnvironmentTag" NOT NULL DEFAULT 'DEVELOPMENT',
    "is_production_record" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "developer_audit_logs" (
    "id" TEXT NOT NULL,
    "developer_user_id" TEXT,
    "action" TEXT NOT NULL,
    "target_component" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_audit_logs_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");


-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");


-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");


-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");


-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");


-- CreateIndex
CREATE INDEX "developer_audit_logs_developer_user_id_idx" ON "developer_audit_logs"("developer_user_id");


-- CreateIndex
CREATE INDEX "developer_audit_logs_created_at_idx" ON "developer_audit_logs"("created_at");


-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "developer_audit_logs" ADD CONSTRAINT "developer_audit_logs_developer_user_id_fkey" FOREIGN KEY ("developer_user_id") REFERENCES "developer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


