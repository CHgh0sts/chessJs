-- AlterTable
ALTER TABLE "public"."games" ADD COLUMN     "currentPlayer" TEXT NOT NULL DEFAULT 'white',
ADD COLUMN     "lastMoveTime" TIMESTAMP(3),
ALTER COLUMN "moves" SET DEFAULT '[]';
