CREATE TABLE "filter_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filter_groups_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "filter_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"value" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filter_options_group_id_value_unique" UNIQUE("group_id","value")
);
--> statement-breakpoint
ALTER TABLE "filter_options" ADD CONSTRAINT "filter_options_group_id_filter_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."filter_groups"("id") ON DELETE cascade ON UPDATE no action;