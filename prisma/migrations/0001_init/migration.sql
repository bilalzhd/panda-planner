-- Initial schema for Mera Kommunikation
-- Note: This is a handcrafted baseline for PostgreSQL matching prisma/schema.prisma

CREATE TYPE "TaskStatus" AS ENUM ('TODO','IN_PROGRESS','DONE');
CREATE TYPE "TaskPriority" AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY','WEEKLY','MONTHLY');

CREATE TABLE "User" (
  "id" text PRIMARY KEY,
  "name" text,
  "email" text UNIQUE,
  "emailVerified" timestamp,
  "image" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

CREATE TABLE "Project" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

CREATE TABLE "Task" (
  "id" text PRIMARY KEY,
  "projectId" text NOT NULL REFERENCES "Project"("id") ON DELETE RESTRICT,
  "parentId" text REFERENCES "Task"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "assignedToId" text REFERENCES "User"("id") ON DELETE SET NULL,
  "dueDate" timestamp,
  "recurring" boolean NOT NULL DEFAULT false,
  "frequency" "RecurrenceFrequency",
  "interval" integer,
  "byWeekday" integer,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

CREATE TABLE "Timesheet" (
  "id" text PRIMARY KEY,
  "taskId" text NOT NULL REFERENCES "Task"("id") ON DELETE RESTRICT,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "hours" numeric(5,2) NOT NULL,
  "notes" text,
  "date" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

CREATE TABLE "Comment" (
  "id" text PRIMARY KEY,
  "taskId" text NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "authorId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

CREATE TABLE "Attachment" (
  "id" text PRIMARY KEY,
  "taskId" text NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "filename" text NOT NULL,
  "url" text NOT NULL,
  "size" integer NOT NULL,
  "mimeType" text NOT NULL,
  "uploadedById" text REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- NextAuth tables
CREATE TABLE "Account" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE "Session" (
  "id" text PRIMARY KEY,
  "sessionToken" text NOT NULL UNIQUE,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE "VerificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expires" timestamp NOT NULL,
  UNIQUE ("identifier", "token")
);

