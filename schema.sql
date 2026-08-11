-- ============================================================================
-- SyncTask AI Database Schema Script (MySQL Compatible)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `taskportal` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `taskportal`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(120) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'ROLE_USER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `status` enum('TODO','IN_PROGRESS','DONE') NOT NULL DEFAULT 'TODO',
  `due_date` date DEFAULT NULL,
  `estimated_hours` int DEFAULT NULL,
  `created_timestamp` datetime(6) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_tasks_user_id` (`user_id`),
  CONSTRAINT `FK_tasks_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Audit Ledger Blocks Table (Cryptographic Blockchain History)
CREATE TABLE IF NOT EXISTS `audit_blocks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `task_id` bigint NOT NULL,
  `action` varchar(255) NOT NULL, -- CREATED, UPDATED, DELETED
  `previous_hash` varchar(64) NOT NULL,
  `hash` varchar(64) NOT NULL,
  `data` text NOT NULL, -- JSON snapshot of the task state at the time
  `timestamp` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_audit_task_id` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
