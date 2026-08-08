-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CoupleProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "suppliesAt" DATETIME,
    "suppliesDone" BOOLEAN NOT NULL DEFAULT false,
    "suppliesDetail" JSONB,
    "requestNeed" TEXT,
    "requestDetail" JSONB,
    "requestAt" DATETIME,
    "requestDone" BOOLEAN NOT NULL DEFAULT false,
    "requestThanked" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "partnerId" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_CoupleProfile" ("id", "inviteCode", "locale", "ownerId", "partnerId", "startDate", "suppliesAt", "suppliesDetail", "suppliesDone") SELECT "id", "inviteCode", "locale", "ownerId", "partnerId", "startDate", "suppliesAt", "suppliesDetail", "suppliesDone" FROM "CoupleProfile";
DROP TABLE "CoupleProfile";
ALTER TABLE "new_CoupleProfile" RENAME TO "CoupleProfile";
CREATE UNIQUE INDEX "CoupleProfile_inviteCode_key" ON "CoupleProfile"("inviteCode");
CREATE UNIQUE INDEX "CoupleProfile_ownerId_key" ON "CoupleProfile"("ownerId");
CREATE UNIQUE INDEX "CoupleProfile_partnerId_key" ON "CoupleProfile"("partnerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
