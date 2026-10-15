CREATE TYPE "public"."listing_report_reason" AS ENUM('counterfeit', 'misleading', 'prohibited_item', 'scam', 'other');--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" "listing_report_reason" NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_reports_reporter_id_listing_id_unique" UNIQUE("reporter_id","listing_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "whatsapp_phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_phone_on_listings" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;