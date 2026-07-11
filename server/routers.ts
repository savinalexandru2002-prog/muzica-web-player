import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAudioTracks, getAudioTrackById, createAudioTrack, deleteAudioTrack, getSpotifyConfig, upsertSpotifyConfig, updateSpotifyTokens } from "./db";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  music: router({
    listTracks: publicProcedure.query(async () => {
      return await getAudioTracks();
    }),

    getTrack: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const track = await getAudioTrackById(input.id);
        if (!track) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Track not found",
          });
        }
        return track;
      }),

    uploadTrack: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          artist: z.string().min(1).max(255),
          duration: z.number().int().positive(),
          fileData: z.instanceof(Buffer),
          fileName: z.string(),
          mimeType: z.string(),
          fileSize: z.number().int().positive(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { key, url } = await storagePut(
            `music/${input.fileName}`,
            input.fileData,
            input.mimeType
          );

          const track = await createAudioTrack({
            title: input.title,
            artist: input.artist,
            duration: input.duration,
            fileKey: key,
            fileUrl: url,
            mimeType: input.mimeType,
            fileSize: input.fileSize,
            uploadedBy: ctx.user.id,
          });

          return track;
        } catch (error) {
          console.error("Upload error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to upload track",
          });
        }
      }),

    deleteTrack: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const track = await getAudioTrackById(input.id);
        if (!track) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Track not found",
          });
        }

        if (track.uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own tracks",
          });
        }

        await deleteAudioTrack(input.id);
        return { success: true };
      }),
  }),

  spotify: router({
    getCurrentTrack: publicProcedure.query(async () => {
      const config = await getSpotifyConfig();
      if (!config || !config.accessToken) {
        return null;
      }

      try {
        if (config.tokenExpiresAt && new Date() > config.tokenExpiresAt) {
          if (config.refreshToken) {
            await refreshSpotifyToken(config);
          }
        }

        const response = await fetch(
          "https://api.spotify.com/v1/me/player/currently-playing",
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
            },
          }
        );

        if (response.status === 204) {
          return { status: "paused", track: null };
        }

        if (response.status === 401) {
          if (config.refreshToken) {
            await refreshSpotifyToken(config);
            const retryConfig = await getSpotifyConfig();
            if (retryConfig?.accessToken) {
              const retryResponse = await fetch(
                "https://api.spotify.com/v1/me/player/currently-playing",
                {
                  headers: {
                    Authorization: `Bearer ${retryConfig.accessToken}`,
                  },
                }
              );
              if (retryResponse.ok) {
                const data = await retryResponse.json();
                return formatSpotifyTrack(data);
              }
            }
          }
          return null;
        }

        if (!response.ok) {
          console.error("Spotify API error:", response.status);
          return null;
        }

        const data = await response.json();
        return formatSpotifyTrack(data);
      } catch (error) {
        console.error("Error fetching Spotify track:", error);
        return null;
      }
    }),

    initializeConfig: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          clientSecret: z.string(),
          accessToken: z.string().optional(),
          refreshToken: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can configure Spotify",
          });
        }

        try {
          const config = await upsertSpotifyConfig({
            clientId: input.clientId,
            clientSecret: input.clientSecret,
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
          });
          return config;
        } catch (error) {
          console.error("Error configuring Spotify:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to configure Spotify",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

async function refreshSpotifyToken(config: any) {
  try {
    const authHeader = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Spotify token refresh failed:", response.status);
      return;
    }

    const data = await response.json();
    if (data.access_token) {
      await updateSpotifyTokens(
        data.access_token,
        data.refresh_token || config.refreshToken,
        data.expires_in || 3600
      );
    }
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
  }
}

function formatSpotifyTrack(data: any) {
  if (!data?.item) {
    return { status: "paused", track: null };
  }

  const item = data.item;
  return {
    status: data.is_playing ? "playing" : "paused",
    track: {
      name: item.name,
      artist: item.artists?.map((a: any) => a.name).join(", ") || "Unknown",
      album: item.album?.name || "Unknown",
      imageUrl: item.album?.images?.[0]?.url,
      duration: item.duration_ms,
      progress: data.progress_ms,
      uri: item.uri,
    },
  };
}
