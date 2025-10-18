-- Add main_category column to venues table
ALTER TABLE venues 
ADD COLUMN main_category VARCHAR(50) DEFAULT 'gaming' NOT NULL;

-- Set all existing venues to 'gaming'
UPDATE venues 
SET main_category = 'gaming' 
WHERE main_category IS NULL;

-- Add constraint for future categories
ALTER TABLE venues
ADD CONSTRAINT check_main_category 
CHECK (main_category IN ('gaming', 'dental', 'wellness-spa'));

-- Add index for performance
CREATE INDEX idx_venues_main_category ON venues(main_category);
