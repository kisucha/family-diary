-- DropForeignKey
ALTER TABLE `plan_items` DROP FOREIGN KEY `fk_plan_items_parent`;

-- AddForeignKey
ALTER TABLE `plan_items` ADD CONSTRAINT `plan_items_parent_task_id_fkey` FOREIGN KEY (`parent_task_id`) REFERENCES `plan_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
