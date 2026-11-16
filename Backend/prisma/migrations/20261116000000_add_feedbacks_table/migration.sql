-- CreateTable
CREATE TABLE IF NOT EXISTS "feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" VARCHAR(191),
    "user_id" VARCHAR(191),
    "submitter_name" VARCHAR(255) NOT NULL,
    "submitter_email" VARCHAR(255),
    "submitter_phone" VARCHAR(50),
    "submitter_role" VARCHAR(100),
    "category" VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
    "rating" INTEGER DEFAULT 5,
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(50) DEFAULT 'RECEIVED',
    "developer_response" TEXT,
    "owner_response" TEXT,
    "responded_by" VARCHAR(255),
    "responded_at" TIMESTAMP(3),
    "device_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_feedbacks_tenant_id" ON "feedbacks"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_status" ON "feedbacks"("status");
CREATE INDEX IF NOT EXISTS "idx_feedbacks_created_at" ON "feedbacks"("created_at" DESC);
