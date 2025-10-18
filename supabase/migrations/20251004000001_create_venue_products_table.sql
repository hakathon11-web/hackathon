-- Create venue_products table
CREATE TABLE "public"."venue_products" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "price" numeric(10,2) NOT NULL,
    "category" text,
    "images" text[] DEFAULT '{}'::text[],
    "is_available" boolean DEFAULT true,
    "stock_quantity" integer,
    "min_order_quantity" integer DEFAULT 1,
    "max_order_quantity" integer,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);

-- Add primary key
ALTER TABLE "public"."venue_products" ADD CONSTRAINT "venue_products_pkey" PRIMARY KEY ("id");

-- Add foreign key constraint
ALTER TABLE "public"."venue_products" 
ADD CONSTRAINT "venue_products_venue_id_fkey" 
FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE "public"."venue_products" ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX "venue_products_venue_id_idx" ON "public"."venue_products" ("venue_id");
CREATE INDEX "venue_products_category_idx" ON "public"."venue_products" ("category");
CREATE INDEX "venue_products_is_available_idx" ON "public"."venue_products" ("is_available");

-- Add comments for documentation
COMMENT ON TABLE "public"."venue_products" IS 'Products available at each venue (food, drinks, accessories, etc.)';
COMMENT ON COLUMN "public"."venue_products"."name" IS 'Product name';
COMMENT ON COLUMN "public"."venue_products"."description" IS 'Product description';
COMMENT ON COLUMN "public"."venue_products"."price" IS 'Product price';
COMMENT ON COLUMN "public"."venue_products"."category" IS 'Product category (food, drinks, accessories, etc.)';
COMMENT ON COLUMN "public"."venue_products"."images" IS 'Array of product image URLs';
COMMENT ON COLUMN "public"."venue_products"."is_available" IS 'Whether the product is currently available';
COMMENT ON COLUMN "public"."venue_products"."stock_quantity" IS 'Current stock quantity (null for unlimited)';
COMMENT ON COLUMN "public"."venue_products"."min_order_quantity" IS 'Minimum order quantity';
COMMENT ON COLUMN "public"."venue_products"."max_order_quantity" IS 'Maximum order quantity per order';
