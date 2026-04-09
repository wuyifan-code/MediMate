-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "email_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "promotional_notifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "push_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sms_notifications" BOOLEAN NOT NULL DEFAULT true;
