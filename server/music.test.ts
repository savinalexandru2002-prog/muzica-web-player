import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getAudioTracks: vi.fn().mockResolvedValue([
    {
      id: 1,
      title: "Test Track",
      artist: "Test Artist",
      duration: 180,
      fileKey: "music/test.mp3",
      fileUrl: "/manus-storage/music/test.mp3",
      mimeType: "audio/mpeg",
      fileSize: 5000000,
      uploadedBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getAudioTrackById: vi.fn().mockResolvedValue({
    id: 1,
    title: "Test Track",
    artist: "Test Artist",
    duration: 180,
    fileKey: "music/test.mp3",
    fileUrl: "/manus-storage/music/test.mp3",
    mimeType: "audio/mpeg",
    fileSize: 5000000,
    uploadedBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  createAudioTrack: vi.fn().mockResolvedValue({
    id: 2,
    title: "New Track",
    artist: "New Artist",
    duration: 200,
    fileKey: "music/new.mp3",
    fileUrl: "/manus-storage/music/new.mp3",
    mimeType: "audio/mpeg",
    fileSize: 6000000,
    uploadedBy: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  deleteAudioTrack: vi.fn().mockResolvedValue(undefined),
  getSpotifyConfig: vi.fn().mockResolvedValue(null),
  upsertSpotifyConfig: vi.fn().mockResolvedValue({
    id: 1,
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    tokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateSpotifyTokens: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "music/test_a1b2c3d4.mp3",
    url: "/manus-storage/music/test_a1b2c3d4.mp3",
  }),
  storageGet: vi.fn().mockResolvedValue({
    key: "music/test.mp3",
    url: "/manus-storage/music/test.mp3",
  }),
}));

function createMockContext(userId: number = 1, role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `User ${userId}`,
      loginMethod: "oauth",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Music API", () => {
  describe("music.listTracks", () => {
    it("should return all audio tracks", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.music.listTracks();

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Test Track");
      expect(result[0]?.artist).toBe("Test Artist");
    });
  });

  describe("music.getTrack", () => {
    it("should return a specific track by ID", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.music.getTrack({ id: 1 });

      expect(result.title).toBe("Test Track");
      expect(result.id).toBe(1);
    });

    it("should throw error for non-existent track", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const { getAudioTrackById } = await import("./db");
      vi.mocked(getAudioTrackById).mockResolvedValueOnce(undefined);

      await expect(caller.music.getTrack({ id: 999 })).rejects.toThrow("Track not found");
    });
  });

  describe("music.uploadTrack", () => {
    it("should upload a new track when authenticated", async () => {
      const ctx = createMockContext(1, "user");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.music.uploadTrack({
        title: "New Track",
        artist: "New Artist",
        duration: 200,
        fileData: Buffer.from("fake audio data"),
        fileName: "new.mp3",
        mimeType: "audio/mpeg",
        fileSize: 6000000,
      });

      expect(result.id).toBe(2);
      expect(result.title).toBe("New Track");
    });

    it("should throw error when not authenticated", async () => {
      const ctx = createMockContext();
      ctx.user = null;
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.music.uploadTrack({
          title: "New Track",
          artist: "New Artist",
          duration: 200,
          fileData: Buffer.from("fake audio data"),
          fileName: "new.mp3",
          mimeType: "audio/mpeg",
          fileSize: 6000000,
        })
      ).rejects.toThrow();
    });

    it("should validate track title is not empty", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.music.uploadTrack({
          title: "",
          artist: "Artist",
          duration: 200,
          fileData: Buffer.from("fake audio data"),
          fileName: "new.mp3",
          mimeType: "audio/mpeg",
          fileSize: 6000000,
        })
      ).rejects.toThrow();
    });
  });

  describe("music.deleteTrack", () => {
    it("should delete a track uploaded by the user", async () => {
      const ctx = createMockContext(1, "user");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.music.deleteTrack({ id: 1 });

      expect(result.success).toBe(true);
    });

    it("should allow admin to delete any track", async () => {
      const ctx = createMockContext(2, "admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.music.deleteTrack({ id: 1 });

      expect(result.success).toBe(true);
    });

    it("should throw error when user tries to delete another user's track", async () => {
      const ctx = createMockContext(2, "user");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.music.deleteTrack({ id: 1 })).rejects.toThrow("You can only delete your own tracks");
    });
  });

  describe("Spotify API", () => {
    describe("spotify.getCurrentTrack", () => {
      it("should return null when no Spotify config exists", async () => {
        const ctx = createMockContext();
        const caller = appRouter.createCaller(ctx);

        const result = await caller.spotify.getCurrentTrack();

        expect(result).toBeNull();
      });
    });

    describe("spotify.initializeConfig", () => {
      it("should allow admin to initialize Spotify config", async () => {
        const ctx = createMockContext(1, "admin");
        const caller = appRouter.createCaller(ctx);

        const result = await caller.spotify.initializeConfig({
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
          accessToken: "test-access-token",
          refreshToken: "test-refresh-token",
        });

        expect(result).toBeDefined();
        expect(result.clientId).toBe("test-client-id");
      });

      it("should throw error when non-admin tries to configure Spotify", async () => {
        const ctx = createMockContext(1, "user");
        const caller = appRouter.createCaller(ctx);

        await expect(
          caller.spotify.initializeConfig({
            clientId: "test-client-id",
            clientSecret: "test-client-secret",
          })
        ).rejects.toThrow("Only admins can configure Spotify");
      });
    });
  });
});
