-- Drop existing RLS policies for venue_products
DROP POLICY IF EXISTS "Users can view venue products" ON "public"."venue_products";
DROP POLICY IF EXISTS "Partners can create venue products" ON "public"."venue_products";
DROP POLICY IF EXISTS "Partners can update venue products" ON "public"."venue_products";
DROP POLICY IF EXISTS "Partners can delete venue products" ON "public"."venue_products";

-- Create new RLS policies that work with both partners and employees
-- Policy for SELECT: Allow viewing products for venues (similar to venue_services)
CREATE POLICY "Anyone can view venue products" ON "public"."venue_products"
    FOR SELECT USING (true);

-- Policy for INSERT: Partners can create products for venues they own
CREATE POLICY "Partners can create venue products" ON "public"."venue_products"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND "venues"."partner_id" = auth.uid()
        )
    );

-- Policy for UPDATE: Partners can update products for venues they own
CREATE POLICY "Partners can update venue products" ON "public"."venue_products"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND "venues"."partner_id" = auth.uid()
        )
    );

-- Policy for DELETE: Partners can delete products for venues they own
CREATE POLICY "Partners can delete venue products" ON "public"."venue_products"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "public"."venues" 
            WHERE "venues"."id" = "venue_products"."venue_id" 
            AND "venues"."partner_id" = auth.uid()
        )
    );

-- Add admin policies for full access
CREATE POLICY "Admins can manage all venue products" ON "public"."venue_products"
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());
