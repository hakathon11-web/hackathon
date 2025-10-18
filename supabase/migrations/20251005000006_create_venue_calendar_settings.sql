-- Create venue_calendar_settings table for storing venue-specific calendar configurations
CREATE TABLE "public"."venue_calendar_settings" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" uuid NOT NULL,
    "settings" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("id"),
    UNIQUE ("venue_id")
);

-- Enable RLS
ALTER TABLE "public"."venue_calendar_settings" ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX "venue_calendar_settings_venue_id_idx" ON "public"."venue_calendar_settings" ("venue_id");

-- Add foreign key constraint to venues table
ALTER TABLE "public"."venue_calendar_settings" 
ADD CONSTRAINT "venue_calendar_settings_venue_id_fkey" 
FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;

-- RLS Policies

-- Allow venue partners to manage their venue's calendar settings
CREATE POLICY "Venue partners can manage calendar settings"
ON "public"."venue_calendar_settings"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM venues 
    WHERE venues.id = venue_calendar_settings.venue_id 
    AND venues.partner_id = auth.uid()
  )
);

-- Allow employees to view and update their venue's calendar settings
CREATE POLICY "Employees can view and update venue calendar settings"
ON "public"."venue_calendar_settings"
AS PERMISSIVE
FOR ALL
TO authenticated, anon
USING (
  -- Allow if user is authenticated admin
  is_admin() 
  OR 
  -- Allow if user is employee of the venue
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.venue_id = venue_calendar_settings.venue_id 
    AND employees.id = COALESCE(
      (current_setting('app.current_employee_id', true))::uuid,
      NULL
    )
  )
  OR
  -- Allow if user is partner of the venue
  EXISTS (
    SELECT 1 FROM venues 
    WHERE venues.id = venue_calendar_settings.venue_id 
    AND venues.partner_id = auth.uid()
  )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_venue_calendar_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_venue_calendar_settings_updated_at
  BEFORE UPDATE ON "public"."venue_calendar_settings"
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_calendar_settings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE "public"."venue_calendar_settings" IS 'Stores venue-specific calendar settings including schedule timing, colors, and thresholds';
COMMENT ON COLUMN "public"."venue_calendar_settings"."settings" IS 'JSONB object containing all calendar settings for the venue';
COMMENT ON COLUMN "public"."venue_calendar_settings"."venue_id" IS 'Reference to the venue this settings belong to';

-- Grant necessary permissions
GRANT ALL ON "public"."venue_calendar_settings" TO authenticated;
GRANT ALL ON "public"."venue_calendar_settings" TO anon;
