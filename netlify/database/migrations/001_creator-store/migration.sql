CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"kind" text NOT NULL,
	"size" integer NOT NULL
);


CREATE TABLE "limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires" bigint NOT NULL
);


CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"product_id" text NOT NULL,
	"store_id" text NOT NULL,
	"buyer_name" text NOT NULL,
	"email" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"demo" integer DEFAULT 0 NOT NULL,
	"slot_id" text DEFAULT '' NOT NULL,
	"stripe_session" text DEFAULT '' NOT NULL,
	"created" text NOT NULL,
	"consent" integer DEFAULT 0 NOT NULL
);


CREATE UNIQUE INDEX "orders_token_unique" ON "orders" ("token");

CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"cover" text DEFAULT '' NOT NULL,
	"file_id" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '[]' NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"meeting_url" text DEFAULT '' NOT NULL,
	"published" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created" text NOT NULL
);


CREATE TABLE "progress" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"lesson_id" text NOT NULL
);


CREATE UNIQUE INDEX "progress_lesson" ON "progress" ("order_id","lesson_id");

CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" bigint NOT NULL
);


CREATE TABLE "slots" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"starts" text NOT NULL,
	"order_id" text,
	"hold_until" bigint DEFAULT 0 NOT NULL
);


CREATE UNIQUE INDEX "slot_product_time" ON "slots" ("product_id","starts");

CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"bio" text NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"theme" text DEFAULT 'purple' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"stripe_account" text DEFAULT '' NOT NULL
);


CREATE UNIQUE INDEX "stores_user_id_unique" ON "stores" ("user_id");

CREATE UNIQUE INDEX "stores_handle_unique" ON "stores" ("handle");

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"salt" text NOT NULL,
	"demo" integer DEFAULT 0 NOT NULL,
	"created" text NOT NULL
);


CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");

CREATE TABLE "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"created" text NOT NULL
);
