CREATE TABLE `audioTracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`artist` varchar(255) NOT NULL,
	`duration` int NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(64) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audioTracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `audioTracks_fileKey_unique` UNIQUE(`fileKey`)
);
--> statement-breakpoint
CREATE TABLE `spotifyConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`clientSecret` varchar(255) NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spotifyConfig_id` PRIMARY KEY(`id`)
);
