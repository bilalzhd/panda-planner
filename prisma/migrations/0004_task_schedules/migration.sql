CREATE TABLE "TaskSchedule" (
  "id" text PRIMARY KEY,
  "taskId" text NOT NULL REFERENCES "Task"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "isRecurring" boolean NOT NULL DEFAULT false,
  "frequency" "RecurrenceFrequency",
  "byWeekday" integer,
  "timeOfDay" text,
  "durationMin" integer,
  "date" timestamp,
  "startDate" timestamp,
  "endDate" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL
);

