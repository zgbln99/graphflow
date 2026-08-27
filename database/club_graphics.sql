-- Club Graphics v1 schema
CREATE TABLE IF NOT EXISTS cg_seasons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_matches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_id INT UNSIGNED NOT NULL,
  home_team VARCHAR(160) NOT NULL,
  away_team VARCHAR(160) NOT NULL,
  match_date DATETIME NOT NULL,
  venue VARCHAR(255) NULL,
  competition VARCHAR(160) NULL,
  round_name VARCHAR(80) NULL,
  home_score INT NULL,
  away_score INT NULL,
  status ENUM('planned','live','finished','cancelled') NOT NULL DEFAULT 'planned',
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cg_matches_season FOREIGN KEY (season_id) REFERENCES cg_seasons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_s3_folders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id INT UNSIGNED NULL,
  name VARCHAR(160) NOT NULL,
  bucket VARCHAR(190) NOT NULL,
  prefix_path VARCHAR(700) NOT NULL,
  role ENUM('photographer','social','selected','archive','custom') NOT NULL DEFAULT 'custom',
  is_upload_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cg_folders_match FOREIGN KEY (match_id) REFERENCES cg_matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category ENUM('match','other') NOT NULL DEFAULT 'match',
  width INT NOT NULL DEFAULT 1080,
  height INT NOT NULL DEFAULT 1350,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  preview_key VARCHAR(700) NULL,
  definition JSON NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_match_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id INT UNSIGNED NOT NULL,
  template_id INT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('todo','ready','published') NOT NULL DEFAULT 'todo',
  UNIQUE KEY uq_cg_match_template(match_id, template_id),
  CONSTRAINT fk_cg_mt_match FOREIGN KEY (match_id) REFERENCES cg_matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_cg_mt_template FOREIGN KEY (template_id) REFERENCES cg_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_template_assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_id INT UNSIGNED NOT NULL,
  kind ENUM('overlay','background','mask','font','image') NOT NULL,
  object_key VARCHAR(700) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cg_assets_template FOREIGN KEY (template_id) REFERENCES cg_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_designs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_id INT UNSIGNED NOT NULL,
  match_id INT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  values_json JSON NOT NULL,
  state_json JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cg_design_template FOREIGN KEY (template_id) REFERENCES cg_templates(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cg_design_match FOREIGN KEY (match_id) REFERENCES cg_matches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_exports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  design_id BIGINT UNSIGNED NOT NULL,
  object_key VARCHAR(700) NOT NULL,
  format ENUM('png','jpg','webp','pdf') NOT NULL DEFAULT 'png',
  width INT NOT NULL,
  height INT NOT NULL,
  file_size BIGINT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cg_export_design FOREIGN KEY (design_id) REFERENCES cg_designs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cg_photo_index (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  folder_id INT UNSIGNED NOT NULL,
  object_key VARCHAR(700) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  etag VARCHAR(255) NULL,
  width INT NULL,
  height INT NULL,
  file_size BIGINT NULL,
  taken_at DATETIME NULL,
  thumb_key VARCHAR(700) NULL,
  is_selected TINYINT(1) NOT NULL DEFAULT 0,
  metadata JSON NULL,
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cg_photo_object(folder_id, object_key),
  CONSTRAINT fk_cg_photo_folder FOREIGN KEY (folder_id) REFERENCES cg_s3_folders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
