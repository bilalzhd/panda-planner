-- Add Clerk support and multi-tenant teams/memberships/invites

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerkId" text UNIQUE;

CREATE TYPE "TeamRole" AS ENUM ('OWNER','ADMIN','MEMBER');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING','ACCEPTED','EXPIRED');

CREATE TABLE "Team" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "ownerId" text NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

CREATE TABLE "Membership" (
  "id" text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("teamId","userId")
);

CREATE TABLE "TeamInvite" (
  "id" text PRIMARY KEY,
  "teamId" text NOT NULL REFERENCES "Team"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedById" text NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "Project" ADD COLUMN "teamId" text;
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT;

