ALTER TABLE "users" ADD COLUMN "shop_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_collector_profile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "whatsapp_phone";