/*
  Warnings:

  - You are about to drop the column `streamId` on the `CurrentPlaying` table. All the data in the column will be lost.
  - Added the required column `extractedId` to the `CurrentPlaying` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `CurrentPlaying` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `CurrentPlaying` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CurrentPlaying" DROP CONSTRAINT "CurrentPlaying_roomId_fkey";

-- DropForeignKey
ALTER TABLE "CurrentPlaying" DROP CONSTRAINT "CurrentPlaying_streamId_fkey";

-- DropForeignKey
ALTER TABLE "Stream" DROP CONSTRAINT "Stream_roomId_fkey";

-- DropIndex
DROP INDEX "CurrentPlaying_streamId_key";

-- AlterTable
ALTER TABLE "CurrentPlaying" DROP COLUMN "streamId",
ADD COLUMN     "extractedId" TEXT NOT NULL,
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentPlaying" ADD CONSTRAINT "CurrentPlaying_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
