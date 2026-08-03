-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "careProfile" JSONB,
    "phase" TEXT,
    "phaseUpdatedAt" DATETIME,
    "mood" TEXT,
    "moodUpdatedAt" DATETIME,
    "pausePartner" BOOLEAN NOT NULL DEFAULT false,
    "cycleDay" INTEGER,
    "cycleDayVisible" BOOLEAN NOT NULL DEFAULT false,
    "coupleId" TEXT,
    "subStatus" TEXT NOT NULL DEFAULT 'NONE',
    "subExpiresAt" DATETIME,
    "freeCardsUsed" INTEGER NOT NULL DEFAULT 0,
    "firstName" TEXT,
    "partnerProfile" JSONB,
    "promptTime" TEXT,
    "sosUsed" INTEGER NOT NULL DEFAULT 0,
    "sosDate" TEXT,
    "needsSpace" BOOLEAN NOT NULL DEFAULT false,
    "dayStates" JSONB,
    "pushSubs" JSONB,
    "lastPushDate" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "CoupleProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("careProfile", "coupleId", "createdAt", "cycleDay", "cycleDayVisible", "dayStates", "email", "firstName", "freeCardsUsed", "id", "lastPushDate", "mood", "moodUpdatedAt", "needsSpace", "partnerProfile", "passwordHash", "pausePartner", "phase", "phaseUpdatedAt", "promptTime", "pushSubs", "role", "sosDate", "sosUsed", "subExpiresAt", "subStatus", "updatedAt") SELECT "careProfile", "coupleId", "createdAt", "cycleDay", "cycleDayVisible", "dayStates", "email", "firstName", "freeCardsUsed", "id", "lastPushDate", "mood", "moodUpdatedAt", "needsSpace", "partnerProfile", "passwordHash", "pausePartner", "phase", "phaseUpdatedAt", "promptTime", "pushSubs", "role", "sosDate", "sosUsed", "subExpiresAt", "subStatus", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
