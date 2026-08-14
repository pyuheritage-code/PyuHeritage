CREATE DATABASE IF NOT EXISTS pyu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pyu;

CREATE TABLE IF NOT EXISTS document_chunks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    source_filename VARCHAR(255) NOT NULL,
    file_hash       CHAR(40)     NOT NULL,
    chunk_index     INT          NOT NULL,
    text            MEDIUMTEXT   NOT NULL,
    embedding       TEXT         NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_source_chunk (source_filename, chunk_index),
    KEY idx_source (source_filename)
);
