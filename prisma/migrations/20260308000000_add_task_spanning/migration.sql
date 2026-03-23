-- AlterTable: plan_items에 다중일 스패닝 지원 컬럼 추가
ALTER TABLE `plan_items`
  ADD COLUMN `parent_task_id` BIGINT NULL,
  ADD COLUMN `total_span_days` INT NOT NULL DEFAULT 1,
  ADD CONSTRAINT `fk_plan_items_parent` FOREIGN KEY (`parent_task_id`) REFERENCES `plan_items` (`id`) ON DELETE SET NULL;

-- Index: parent_task_id 조회 최적화
CREATE INDEX `plan_items_parent_task_id_idx` ON `plan_items`(`parent_task_id`);
