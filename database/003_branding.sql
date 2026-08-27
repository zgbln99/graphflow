CREATE TABLE IF NOT EXISTS cg_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cg_settings (setting_key, setting_value)
VALUES ('brand_logo_url', NULL)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
