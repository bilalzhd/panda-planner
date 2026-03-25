CREATE TABLE "_TasksAssigned" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

INSERT INTO "_TasksAssigned" ("A", "B")
SELECT "id", "assignedToId"
FROM "Task"
WHERE "assignedToId" IS NOT NULL;

CREATE UNIQUE INDEX "_TasksAssigned_AB_unique" ON "_TasksAssigned"("A", "B");

CREATE INDEX "_TasksAssigned_B_index" ON "_TasksAssigned"("B");

ALTER TABLE "_TasksAssigned"
ADD CONSTRAINT "_TasksAssigned_A_fkey"
FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_TasksAssigned"
ADD CONSTRAINT "_TasksAssigned_B_fkey"
FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

ALTER TABLE "Task" DROP COLUMN "assignedToId";
