-- CreateEnum
CREATE TYPE "public"."GameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "public"."GameResult" AS ENUM ('WHITE_WINS', 'BLACK_WINS', 'DRAW');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "gamesDraw" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."games" (
    "id" TEXT NOT NULL,
    "whiteId" TEXT NOT NULL,
    "blackId" TEXT NOT NULL,
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "moves" TEXT NOT NULL DEFAULT '',
    "status" "public"."GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "result" "public"."GameResult",
    "timeControl" INTEGER NOT NULL DEFAULT 600000,
    "timeLeft" TEXT NOT NULL DEFAULT '{"white":600000,"black":600000}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- AddForeignKey
ALTER TABLE "public"."games" ADD CONSTRAINT "games_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."games" ADD CONSTRAINT "games_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
