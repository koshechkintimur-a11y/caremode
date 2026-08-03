-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastPushDate" TEXT;
ALTER TABLE "User" ADD COLUMN "pushSubs" JSONB;
