-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "careProfile" JSONB,
    "phase" TEXT,
    "phaseUpdatedAt" DATETIME,
    "mood" TEXT,
    "moodUpdatedAt" DATETIME,
    "pausePartner" BOOLEAN NOT NULL DEFAULT false,
    "coupleId" TEXT,
    "subStatus" TEXT NOT NULL DEFAULT 'NONE',
    "subExpiresAt" DATETIME,
    "freeCardsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "CoupleProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoupleProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inviteCode" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "ownerId" TEXT NOT NULL,
    "partnerId" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'FALLBACK',
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyPrompt_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "CoupleProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleProfile_inviteCode_key" ON "CoupleProfile"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleProfile_ownerId_key" ON "CoupleProfile"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleProfile_partnerId_key" ON "CoupleProfile"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPrompt_coupleId_day_key" ON "DailyPrompt"("coupleId", "day");
