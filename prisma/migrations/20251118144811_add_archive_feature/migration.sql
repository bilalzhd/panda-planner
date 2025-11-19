-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProjectAccess" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
