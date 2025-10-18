-- Add main_category field to services table
ALTER TABLE services
ADD COLUMN main_category VARCHAR(50) DEFAULT 'gaming' NOT NULL;

-- Set all existing services to 'gaming' category
UPDATE services
SET main_category = 'gaming'
WHERE main_category IS NULL;

-- Add constraint for valid categories (same as venues)
ALTER TABLE services
ADD CONSTRAINT check_services_main_category
CHECK (main_category IN ('gaming', 'dental', 'wellness-spa'));

-- Add index for performance
CREATE INDEX idx_services_main_category ON services(main_category);

-- Add comment to explain the purpose
COMMENT ON COLUMN services.main_category IS 'Main category this service belongs to (gaming, dental, wellness-spa)';
