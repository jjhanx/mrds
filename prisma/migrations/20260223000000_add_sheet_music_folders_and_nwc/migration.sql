-- CreateTable
CREATE TABLE "SheetMusicFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SheetMusicNwcFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sheetMusicId" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SheetMusicNwcFile_sheetMusicId_fkey" FOREIGN KEY ("sheetMusicId") REFERENCES "SheetMusic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
CREATE TABLE "new_SheetMusic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folderId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filepath" TEXT NOT NULL,
    "composer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SheetMusic_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "SheetMusicFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_SheetMusic" ("id", "title", "description", "filepath", "composer", "createdAt", "updatedAt") SELECT "id", "title", "description", "filepath", "composer", "createdAt", "updatedAt" FROM "SheetMusic";

DROP TABLE "SheetMusic";

ALTER TABLE "new_SheetMusic" RENAME TO "SheetMusic";

-- CreateIndex
CREATE UNIQUE INDEX "SheetMusicFolder_slug_key" ON "SheetMusicFolder"("slug");

-- CreateIndex
CREATE INDEX "SheetMusicNwcFile_sheetMusicId_idx" ON "SheetMusicNwcFile"("sheetMusicId");
