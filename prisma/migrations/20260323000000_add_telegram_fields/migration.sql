-- AlterTable: profiles에 텔레그램 알림 필드 추가
ALTER TABLE `profiles` ADD COLUMN `telegram_bot_token` VARCHAR(200) NULL;
ALTER TABLE `profiles` ADD COLUMN `telegram_chat_id` VARCHAR(50) NULL;
