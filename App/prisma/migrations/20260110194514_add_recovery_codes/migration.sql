-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "paternalSurname" TEXT NOT NULL,
    "maternalSurname" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME,
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "investedCapital" DECIMAL NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL NOT NULL DEFAULT 0,
    "recoveryCodesViewedAt" DATETIME,
    "failedRecoveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedRecoveryAt" DATETIME
);
INSERT INTO "new_User" ("availableBalance", "createdAt", "email", "firstName", "id", "investedCapital", "lastLogin", "maternalSurname", "password", "paternalSurname", "role", "tokenVersion", "totpEnabled", "totpSecret", "updatedAt") SELECT "availableBalance", "createdAt", "email", "firstName", "id", "investedCapital", "lastLogin", "maternalSurname", "password", "paternalSurname", "role", "tokenVersion", "totpEnabled", "totpSecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_idx" ON "RecoveryCode"("userId");
