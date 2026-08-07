CREATE DATABASE IF NOT EXISTS pyu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pyu;

CREATE TABLE IF NOT EXISTS artifact_embeddings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    source_table VARCHAR(50)  NOT NULL,
    source_id    INT          NOT NULL,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    category     VARCHAR(100),
    embedding    TEXT         NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_source (source_table, source_id)
);
