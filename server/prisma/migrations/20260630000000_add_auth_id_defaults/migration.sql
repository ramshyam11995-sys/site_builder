-- Enable UUID generation support for Postgres
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "user"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "session"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "account"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "verification"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
