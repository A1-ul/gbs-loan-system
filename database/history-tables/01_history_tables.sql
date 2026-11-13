-- Workflow & Deployment History Tables
-- CreateTable
CREATE TABLE "loan_workflow_logs" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "from_status" "LoanStatus" NOT NULL,
    "to_status" "LoanStatus" NOT NULL,
    "performed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_workflow_logs_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "collector_location_logs" (
    "id" TEXT NOT NULL,
    "collector_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "status" "CollectorStatus" NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "is_offline_sync" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collector_location_logs_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "deployment_history" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "provider" TEXT NOT NULL DEFAULT 'render',
    "commit_sha" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DEPLOYED',
    "deployed_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_history_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "loan_workflow_logs_loan_id_idx" ON "loan_workflow_logs"("loan_id");


-- CreateIndex
CREATE INDEX "collector_location_logs_collector_id_idx" ON "collector_location_logs"("collector_id");


-- CreateIndex
CREATE INDEX "collector_location_logs_recorded_at_idx" ON "collector_location_logs"("recorded_at");


-- CreateIndex
CREATE INDEX "deployment_history_environment_created_at_idx" ON "deployment_history"("environment", "created_at");


-- AddForeignKey
ALTER TABLE "loan_workflow_logs" ADD CONSTRAINT "loan_workflow_logs_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "collector_location_logs" ADD CONSTRAINT "collector_location_logs_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;


