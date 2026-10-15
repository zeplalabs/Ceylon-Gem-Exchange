CREATE TYPE "public"."equipment_condition" AS ENUM('new', 'used', 'refurbished');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'pending_review', 'active', 'expired', 'sold', 'removed');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('gem', 'equipment');--> statement-breakpoint
CREATE TABLE "equipment_details" (
	"listing_id" uuid PRIMARY KEY NOT NULL,
	"equipment_type" text NOT NULL,
	"brand" text,
	"model" text,
	"condition" "equipment_condition" DEFAULT 'used' NOT NULL,
	"year_manufactured" integer,
	"specifications" text,
	"warranty_info" text
);
--> statement-breakpoint
CREATE TABLE "gem_details" (
	"listing_id" uuid PRIMARY KEY NOT NULL,
	"species" text NOT NULL,
	"carat_weight" double precision NOT NULL,
	"shape" text,
	"color" text,
	"clarity" text,
	"origin" text,
	"treatment" text,
	"dimensions" text,
	"cut_grade" text,
	"refractive_index" text,
	"cert_authority" text,
	"cert_number" text,
	"cert_issued_at" timestamp with time zone,
	"lot_number" text
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"type" "listing_type" NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price_amount_cents" integer NOT NULL,
	"price_currency" text NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment_details" ADD CONSTRAINT "equipment_details_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gem_details" ADD CONSTRAINT "gem_details_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_price_currency_currencies_code_fk" FOREIGN KEY ("price_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;