CREATE TABLE "saved_search_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_search_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_matches" ADD CONSTRAINT "saved_search_matches_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;