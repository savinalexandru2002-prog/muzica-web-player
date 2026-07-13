# Muzica Web Player - API Documentation

## Overview

The Muzica Web Player provides a complete REST API via tRPC for managing audio tracks and Spotify integration. All endpoints are accessible through `/api/trpc` and require proper authentication where specified.

## Authentication

All protected endpoints require a valid user session. Authentication is handled via Manus OAuth. Include the session cookie automatically with all requests.

- **Public Endpoints**: No authentication required
- **Protected Endpoints**: Requires authenticated user session
- **Admin Endpoints**: Requires admin role

## Music Management API

### `music.listTracks`

**Type**: Query (GET)  
**Authentication**: Public  
**Description**: Retrieve all available audio tracks

**Response**:
```typescript
Array<{
  id: number;
  title: string;
  artist: string;
  duration: number;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
}>
```

**Example**:
```javascript
const tracks = await trpc.music.listTracks.query();
```

---

### `music.getTrack`

**Type**: Query (GET)  
**Authentication**: Public  
**Description**: Get a specific track by ID

**Input**:
```typescript
{ id: number }
```

**Response**:
```typescript
{
  id: number;
  title: string;
  artist: string;
  duration: number;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Errors**:
- `NOT_FOUND`: Track does not exist

**Example**:
```javascript
const track = await trpc.music.getTrack.query({ id: 1 });
```

---

### `music.uploadTrack`

**Type**: Mutation (POST)  
**Authentication**: Protected (requires login)  
**Description**: Upload a new audio track to the library

**Input**:
```typescript
{
  title: string;           // Track name (required, non-empty)
  artist: string;          // Artist name (required, non-empty)
  duration: number;        // Duration in seconds
  fileData: Buffer;        // Audio file binary data
  fileName: string;        // Original filename
  mimeType: string;        // MIME type (e.g., "audio/mpeg")
  fileSize: number;        // File size in bytes
}
```

**Response**:
```typescript
{
  id: number;
  title: string;
  artist: string;
  duration: number;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation**:
- Title and artist must not be empty
- File must be a valid audio format (audio/mpeg, audio/wav, audio/ogg, audio/flac)
- File size must be reasonable (< 500MB recommended)

**Errors**:
- `UNAUTHORIZED`: User not authenticated
- `BAD_REQUEST`: Invalid input or file format

**Example**:
```javascript
const newTrack = await trpc.music.uploadTrack.mutate({
  title: "My Song",
  artist: "My Artist",
  duration: 180,
  fileData: audioBuffer,
  fileName: "my-song.mp3",
  mimeType: "audio/mpeg",
  fileSize: 5000000,
});
```

---

### `music.deleteTrack`

**Type**: Mutation (DELETE)  
**Authentication**: Protected (requires login)  
**Description**: Delete an audio track (owner or admin only)

**Input**:
```typescript
{ id: number }
```

**Response**:
```typescript
{ success: boolean }
```

**Authorization**:
- Users can only delete their own tracks
- Admins can delete any track

**Errors**:
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User does not own the track and is not admin
- `NOT_FOUND`: Track does not exist

**Example**:
```javascript
const result = await trpc.music.deleteTrack.mutate({ id: 1 });
```

---

## Spotify Integration API

### `spotify.getCurrentTrack`

**Type**: Query (GET)  
**Authentication**: Public  
**Description**: Get the currently playing track from Spotify (if configured)

**Response**:
```typescript
{
  track: {
    name: string;
    artist: string;
    album: string;
    imageUrl: string;
    isPlaying: boolean;
    progressMs: number;
    durationMs: number;
  };
} | null
```

**Behavior**:
- Returns `null` if Spotify is not configured
- Returns `null` if no track is currently playing
- Automatically refreshes access token if expired
- Polls every 3-5 seconds for real-time updates

**Example**:
```javascript
const spotifyTrack = await trpc.spotify.getCurrentTrack.query();
if (spotifyTrack?.track) {
  console.log(`Now playing: ${spotifyTrack.track.name}`);
}
```

---

### `spotify.initializeConfig`

**Type**: Mutation (POST)  
**Authentication**: Protected (Admin only)  
**Description**: Configure Spotify API credentials

**Input**:
```typescript
{
  clientId: string;           // Spotify Client ID
  clientSecret: string;       // Spotify Client Secret
  accessToken?: string;       // Optional: Current access token
  refreshToken?: string;      // Optional: Refresh token
}
```

**Response**:
```typescript
{
  id: number;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Authorization**:
- Only admins can configure Spotify

**Errors**:
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not admin
- `BAD_REQUEST`: Invalid credentials

**Example**:
```javascript
const config = await trpc.spotify.initializeConfig.mutate({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  accessToken: "access-token",
  refreshToken: "refresh-token",
});
```

---

### `spotify.refreshToken`

**Type**: Mutation (POST)  
**Authentication**: Protected (Admin only)  
**Description**: Manually refresh the Spotify access token

**Response**:
```typescript
{
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}
```

**Authorization**:
- Only admins can refresh tokens

**Errors**:
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User is not admin
- `INTERNAL_SERVER_ERROR`: Failed to refresh token

**Example**:
```javascript
const newToken = await trpc.spotify.refreshToken.mutate();
```

---

## Error Handling

All API errors follow the tRPC error format:

```typescript
{
  code: string;           // Error code (e.g., "UNAUTHORIZED", "NOT_FOUND")
  message: string;        // Human-readable error message
  cause?: unknown;        // Optional: underlying error details
}
```

**Common Error Codes**:
- `PARSE_ERROR`: Invalid input format
- `BAD_REQUEST`: Invalid request data
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `INTERNAL_SERVER_ERROR`: Server error

---

## Rate Limiting

- No explicit rate limits on API endpoints
- Spotify API calls are rate-limited by Spotify (60 requests per minute)
- File uploads are limited to 500MB per file

---

## Best Practices

1. **Always handle errors**: Check for error responses and display user-friendly messages
2. **Cache results**: Store track lists locally to reduce API calls
3. **Implement retry logic**: Retry failed requests with exponential backoff
4. **Use optimistic updates**: Update UI immediately, then sync with server
5. **Validate inputs**: Validate file formats and sizes before uploading
6. **Monitor token expiration**: Check Spotify token expiration and refresh proactively

---

## Setup Instructions

### Spotify Configuration

1. Create a Spotify Developer account at https://developer.spotify.com
2. Create a new application to get Client ID and Client Secret
3. Set the Redirect URI to `https://your-domain.com/api/oauth/callback`
4. Use the `spotify.initializeConfig` endpoint to configure credentials
5. Obtain access and refresh tokens via Spotify OAuth flow

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## Support

For issues or questions, please refer to the project documentation or contact support.
