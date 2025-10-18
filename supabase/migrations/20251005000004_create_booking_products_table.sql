-- Create booking_products table to store products associated with bookings
CREATE TABLE "public"."booking_products" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "quantity" integer NOT NULL DEFAULT 1,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Add primary key
ALTER TABLE "public"."booking_products" ADD CONSTRAINT "booking_products_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
ALTER TABLE "public"."booking_products" 
ADD CONSTRAINT "booking_products_booking_id_fkey" 
FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;

ALTER TABLE "public"."booking_products" 
ADD CONSTRAINT "booking_products_product_id_fkey" 
FOREIGN KEY ("product_id") REFERENCES "public"."venue_products"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."booking_products" ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX "booking_products_booking_id_idx" ON "public"."booking_products" ("booking_id");
CREATE INDEX "booking_products_product_id_idx" ON "public"."booking_products" ("product_id");

-- Add comments for documentation
COMMENT ON TABLE "public"."booking_products" IS 'Products associated with bookings';
COMMENT ON COLUMN "public"."booking_products"."booking_id" IS 'Reference to the booking';
COMMENT ON COLUMN "public"."booking_products"."product_id" IS 'Reference to the venue product';
COMMENT ON COLUMN "public"."booking_products"."quantity" IS 'Quantity of the product ordered';
COMMENT ON COLUMN "public"."booking_products"."unit_price" IS 'Price per unit at time of booking';
COMMENT ON COLUMN "public"."booking_products"."total_price" IS 'Total price for this product line (quantity * unit_price)';

-- Create RLS policies for booking_products
-- Allow venue partners and employees to read booking products
CREATE POLICY "booking_products_select_policy" ON "public"."booking_products"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."bookings" b
            JOIN "public"."venues" v ON b.venue_id = v.id
            WHERE b.id = booking_products.booking_id
            AND (
                v.partner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM "public"."employees" e
                    WHERE e.venue_id = v.id AND e.id = current_setting('app.current_employee_id', true)::uuid
                )
            )
        )
    );

-- Allow venue partners and employees to insert booking products
CREATE POLICY "booking_products_insert_policy" ON "public"."booking_products"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."bookings" b
            JOIN "public"."venues" v ON b.venue_id = v.id
            WHERE b.id = booking_products.booking_id
            AND (
                v.partner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM "public"."employees" e
                    WHERE e.venue_id = v.id AND e.id = current_setting('app.current_employee_id', true)::uuid
                )
            )
        )
    );

-- Allow venue partners and employees to update booking products
CREATE POLICY "booking_products_update_policy" ON "public"."booking_products"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."bookings" b
            JOIN "public"."venues" v ON b.venue_id = v.id
            WHERE b.id = booking_products.booking_id
            AND (
                v.partner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM "public"."employees" e
                    WHERE e.venue_id = v.id AND e.id = current_setting('app.current_employee_id', true)::uuid
                )
            )
        )
    );

-- Allow venue partners and employees to delete booking products
CREATE POLICY "booking_products_delete_policy" ON "public"."booking_products"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."bookings" b
            JOIN "public"."venues" v ON b.venue_id = v.id
            WHERE b.id = booking_products.booking_id
            AND (
                v.partner_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM "public"."employees" e
                    WHERE e.venue_id = v.id AND e.id = current_setting('app.current_employee_id', true)::uuid
                )
            )
        )
    );
