-- DropIndex
DROP INDEX "Activity_userId_idx";

-- DropIndex
DROP INDEX "Company_userId_idx";

-- DropIndex
DROP INDEX "Contact_userId_idx";

-- DropIndex
DROP INDEX "Deal_userId_idx";

-- DropIndex
DROP INDEX "Project_userId_idx";

-- DropIndex
DROP INDEX "Task_projectId_idx";

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Company_userId_createdAt_idx" ON "Company"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Contact_userId_createdAt_idx" ON "Contact"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Deal_userId_createdAt_idx" ON "Deal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_projectId_createdAt_idx" ON "Task"("projectId", "createdAt");
