-- CreateEnum
CREATE TYPE "loan_interest_mode" AS ENUM ('NONE', 'FIXED', 'ON_BALANCE');

-- CreateEnum
CREATE TYPE "loan_interest_period" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "loan_interest_mode" "loan_interest_mode",
ADD COLUMN     "loan_interest_rate" DECIMAL(9,4),
ADD COLUMN     "loan_interest_period" "loan_interest_period",
ADD COLUMN     "loan_interest_from" DATE;
