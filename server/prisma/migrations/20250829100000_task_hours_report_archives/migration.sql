-- CreateEnum
CREATE TYPE "TaskHoursReportArchiveStatus" AS ENUM ('drafted', 'failed');

-- CreateTable
CREATE TABLE "task_hours_report_archives" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "status" "TaskHoursReportArchiveStatus" NOT NULL DEFAULT 'drafted',
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "period_start" TEXT,
    "period_end" TEXT,
    "total_billable_hours" DECIMAL(10,2),
    "n8n_payload" JSONB NOT NULL,
    "n8n_execution_id" TEXT,
    "resent_from_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_hours_report_archives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_hours_report_archives_project_id_idx" ON "task_hours_report_archives"("project_id");

-- CreateIndex
CREATE INDEX "task_hours_report_archives_created_by_id_idx" ON "task_hours_report_archives"("created_by_id");

-- CreateIndex
CREATE INDEX "task_hours_report_archives_created_at_idx" ON "task_hours_report_archives"("created_at");

-- AddForeignKey
ALTER TABLE "task_hours_report_archives" ADD CONSTRAINT "task_hours_report_archives_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_hours_report_archives" ADD CONSTRAINT "task_hours_report_archives_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_hours_report_archives" ADD CONSTRAINT "task_hours_report_archives_resent_from_id_fkey" FOREIGN KEY ("resent_from_id") REFERENCES "task_hours_report_archives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
