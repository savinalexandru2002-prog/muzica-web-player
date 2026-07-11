import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, audioTracks, InsertAudioTrack, AudioTrack, spotifyConfig, InsertSpotifyConfig, SpotifyConfig } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Audio Tracks queries
export async function getAudioTracks(): Promise<AudioTrack[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(audioTracks).orderBy(desc(audioTracks.createdAt));
}

export async function getAudioTrackById(id: number): Promise<AudioTrack | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(audioTracks).where(eq(audioTracks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAudioTrack(track: InsertAudioTrack): Promise<AudioTrack> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(audioTracks).values(track);
  const result = await db.select().from(audioTracks).where(eq(audioTracks.fileKey, track.fileKey)).limit(1);
  if (result.length === 0) throw new Error("Failed to create audio track");
  return result[0];
}

export async function deleteAudioTrack(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(audioTracks).where(eq(audioTracks.id, id));
}

// Spotify Config queries
export async function getSpotifyConfig(): Promise<SpotifyConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(spotifyConfig).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertSpotifyConfig(config: InsertSpotifyConfig): Promise<SpotifyConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSpotifyConfig();
  if (existing) {
    await db.update(spotifyConfig).set(config).where(eq(spotifyConfig.id, existing.id));
    const updated = await db.select().from(spotifyConfig).where(eq(spotifyConfig.id, existing.id)).limit(1);
    return updated[0];
  } else {
    await db.insert(spotifyConfig).values(config);
    const result = await db.select().from(spotifyConfig).limit(1);
    return result[0];
  }
}

export async function updateSpotifyTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const config = await getSpotifyConfig();
  
  if (config) {
    await db.update(spotifyConfig)
      .set({ accessToken, refreshToken, tokenExpiresAt: expiresAt })
      .where(eq(spotifyConfig.id, config.id));
  }
}
