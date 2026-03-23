-- AlterTable: profiles에 텔레그램 알림 선택 필드 추가
ALTER TABLE `profiles` ADD COLUMN `telegram_notify_plans` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `profiles` ADD COLUMN `telegram_notify_events` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `profiles` ADD COLUMN `telegram_notify_incomplete` BOOLEAN NOT NULL DEFAULT true;
