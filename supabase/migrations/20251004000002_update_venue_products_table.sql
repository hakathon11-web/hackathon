-- Remove unwanted columns from venue_products table
ALTER TABLE "public"."venue_products" 
DROP COLUMN IF EXISTS "description",
DROP COLUMN IF EXISTS "category",
DROP COLUMN IF EXISTS "min_order_quantity",
DROP COLUMN IF EXISTS "max_order_quantity";

-- Drop the category index since we removed the category column
DROP INDEX IF EXISTS "venue_products_category_idx";

-- Add RLS policies for venue_products table
-- Policy for SELECT: Users can view products for venues they own or are employees of
CREATE POLICY "Users can view venue products" ON "public"."venue_products"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND (
                "venues"."partner_id" = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM "public"."employees" 
                    WHERE "employees"."venue_id" = "venues"."id" 
                    AND "employees"."username" = auth.jwt() ->> 'username'
                )
            )
        )
    );

-- Policy for INSERT: Users can create products for venues they own
CREATE POLICY "Partners can create venue products" ON "public"."venue_products"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND "venues"."partner_id" = auth.uid()
        )
    );

-- Policy for UPDATE: Users can update products for venues they own
CREATE POLICY "Partners can update venue products" ON "public"."venue_products"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND "venues"."partner_id" = auth.uid()
        )
    );

-- Policy for DELETE: Users can delete products for venues they own
CREATE POLICY "Partners can delete venue products" ON "public"."venue_products"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND "venues"."partner_id" = auth.uid()
        )
    );

-- Update comments for documentation
COMMENT ON TABLE "public"."venue_products" IS 'Products available at each venue (food, drinks, accessories, etc.)';
COMMENT ON COLUMN "public"."venue_products"."name" IS 'Product name';
COMMENT ON COLUMN "public"."venue_products"."price" IS 'Product price';
COMMENT ON COLUMN "public"."venue_products"."images" IS 'Array of product image URLs';
COMMENT ON COLUMN "public"."venue_products"."is_available" IS 'Whether the product is currently available';
COMMENT ON COLUMN "public"."venue_products"."stock_quantity" IS 'Current stock quantity (null for unlimited)';
