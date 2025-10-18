-- Add venue-level discount columns to venues table
ALTER TABLE "public"."venues" 
ADD COLUMN "overall_discount_percent" numeric DEFAULT 0,
ADD COLUMN "overall_discount_service_ids" text[] DEFAULT '{}'::text[],
ADD COLUMN "free_hour_discounts" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "group_discounts" jsonb DEFAULT '[]'::jsonb,
ADD COLUMN "timeslot_discounts" jsonb DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN "public"."venues"."overall_discount_percent" IS 'Overall discount percentage applied to selected services';
COMMENT ON COLUMN "public"."venues"."overall_discount_service_ids" IS 'Array of service IDs that the overall discount applies to';
COMMENT ON COLUMN "public"."venues"."free_hour_discounts" IS 'Free hour discount rules (e.g., book 4 hours get 1 free)';
COMMENT ON COLUMN "public"."venues"."group_discounts" IS 'Group size discount rules (e.g., 10% off for 5+ guests)';
COMMENT ON COLUMN "public"."venues"."timeslot_discounts" IS 'Time-based discount rules (e.g., 15% off during 2-6 PM)';





