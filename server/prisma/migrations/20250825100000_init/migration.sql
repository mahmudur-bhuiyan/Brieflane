-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'PROJECT_MANAGER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "ac_project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "client_name" TEXT,
    "client_email" TEXT,
    "report_recipients" JSONB NOT NULL DEFAULT '[]',
    "custom_metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "triggered_by_id" TEXT NOT NULL,
    "status" "ReportRunStatus" NOT NULL DEFAULT 'pending',
    "n8n_execution_id" TEXT,
    "error_message" TEXT,
    "payload_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_ac_project_id_key" ON "projects"("ac_project_id");

-- CreateIndex
CREATE INDEX "report_runs_project_id_idx" ON "report_runs"("project_id");

-- CreateIndex
CREATE INDEX "report_runs_triggered_by_id_idx" ON "report_runs"("triggered_by_id");

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
