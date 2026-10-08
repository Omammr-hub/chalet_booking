-- Cedar & Stone Chalet Booking System
-- MySQL 8+ reference schema for deployments that use PHP/PDO.
-- The runnable Replit build uses the equivalent PostgreSQL/Drizzle schema in lib/db/src/schema/.

CREATE TABLE admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chalets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  weekday_price DECIMAL(10,2) NOT NULL,
  weekend_price DECIMAL(10,2) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  main_image_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chalet_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chalet_id INT UNSIGNED NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chalet_images_chalet
    FOREIGN KEY (chalet_id) REFERENCES chalets(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chalet_id INT UNSIGNED NOT NULL,
  guest_name VARCHAR(160) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  check_in DATETIME NOT NULL,
  check_out DATETIME NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('Pending', 'Accepted', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_chalet
    FOREIGN KEY (chalet_id) REFERENCES chalets(id) ON DELETE CASCADE,
  INDEX idx_bookings_overlap (chalet_id, status, check_in, check_out)
);

-- Booking conflict rule used before INSERT:
-- WHERE chalet_id = :chalet_id
--   AND status IN ('Accepted', 'Completed')
--   AND check_in < :requested_check_out
--   AND check_out > :requested_check_in