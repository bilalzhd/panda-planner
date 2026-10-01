ALTER TABLE "Project"
ADD COLUMN "seoReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "seoReportDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "seoReportExtraEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "seoReportLastSentAt" TIMESTAMP(3);

CREATE TABLE "SeoPage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "primaryKeyword" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoCheck" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedById" TEXT,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "adsRunning" BOOLEAN NOT NULL DEFAULT false,
    "adsNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeoCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoKeywordRank" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER,
    "qualityScore" INTEGER,
    "adRunning" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SeoKeywordRank_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeoPage_projectId_idx" ON "SeoPage"("projectId");
CREATE INDEX "SeoCheck_pageId_checkedAt_idx" ON "SeoCheck"("pageId", "checkedAt");
CREATE INDEX "SeoKeywordRank_checkId_idx" ON "SeoKeywordRank"("checkId");

ALTER TABLE "SeoPage" ADD CONSTRAINT "SeoPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoCheck" ADD CONSTRAINT "SeoCheck_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoCheck" ADD CONSTRAINT "SeoCheck_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeoKeywordRank" ADD CONSTRAINT "SeoKeywordRank_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "SeoCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
