# Muzica Web Player - Setup & Deployment Guide

## Project Overview

Muzica is a production-ready music player web application featuring:

- **Local Audio Streaming**: Upload and play MP3, WAV, OGG, and FLAC files
- **Spotify Integration**: Real-time "Now Playing" display with automatic token refresh
- **Cinematic Neon-Noir Design**: Deep midnight navy background with hot pink and electric blue glows
- **Responsive Design**: Fully functional on mobile, tablet, and desktop
- **User Authentication**: Secure Manus OAuth integration
- **File Management**: Upload, delete, and organize audio tracks

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Storage**: AWS S3 (Manus managed)
- **Authentication**: Manus OAuth
- **Testing**: Vitest

## Prerequisites

- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL/TiDB database access
- Spotify Developer account (for Spotify integration)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd muzica-web-app
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

The following environment variables are automatically configured:

- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET`: Session signing secret
- `VITE_APP_ID`: Manus OAuth application ID
- `OAUTH_SERVER_URL`: Manus OAuth backend URL
- `VITE_OAUTH_PORTAL_URL`: Manus login portal URL
- `BUILT_IN_FORGE_API_URL`: Manus API endpoint
- `BUILT_IN_FORGE_API_KEY`: Manus API key

### 4. Database Setup

```bash
# Generate database migration
pnpm drizzle-kit generate

# Apply migration (via Management UI or SQL)
# Tables created: users, audioTracks, spotifyConfig
```

### 5. Spotify Configuration (Optional)

To enable Spotify integration:

1. Go to https://developer.spotify.com/dashboard
2. Create a new application
3. Get your Client ID and Client Secret
4. Set Redirect URI to: `https://your-domain.com/api/oauth/callback`
5. Use the admin panel to configure Spotify credentials:
   - Navigate to Settings → Integrations → Spotify
   - Enter Client ID and Client Secret
   - Authorize to get access and refresh tokens

## Development

### Start Development Server

```bash
pnpm dev
```

The server will start on `http://localhost:3000`

### Run Tests

```bash
pnpm test
```

Tests include:
- Music API endpoints (list, upload, delete)
- Spotify integration (token refresh, current track)
- Authentication and authorization
- Error handling

### Type Checking

```bash
pnpm check
```

### Code Formatting

```bash
pnpm format
```

## Project Structure

```
muzica-web-app/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   └── Player.tsx    # Main music player page
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts
│   │   ├── lib/              # Utilities and helpers
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles with neon-noir theme
│   ├── public/               # Static assets
│   └── index.html            # HTML template
├── server/                    # Backend Node.js application
│   ├── routers.ts            # tRPC procedure definitions
│   ├── db.ts                 # Database query helpers
│   ├── storage.ts            # S3 storage helpers
│   ├── music.test.ts         # Music API tests
│   ├── auth.logout.test.ts   # Auth tests
│   └── _core/                # Framework internals
├── drizzle/                  # Database schema and migrations
│   ├── schema.ts             # Table definitions
│   └── migrations/           # SQL migration files
├── shared/                   # Shared types and constants
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
├── vitest.config.ts          # Vitest configuration
├── API_DOCUMENTATION.md      # API reference
└── SETUP_GUIDE.md           # This file
```

## Key Features

### Music Player

- **Play/Pause/Seek**: Full HTML5 audio controls
- **Volume Control**: Adjustable volume with percentage display
- **Playlist Management**: View all uploaded tracks
- **Track Selection**: Click to play any track
- **Progress Display**: Current time and total duration
- **Auto-advance**: Automatically plays next track when current ends

### File Upload

- **Drag & Drop**: Upload files via modal form
- **Format Support**: MP3, WAV, OGG, FLAC
- **Metadata**: Enter track title and artist
- **Validation**: File type and size validation
- **Error Handling**: User-friendly error messages

### Spotify Integration

- **Real-time Updates**: Polls every 3-5 seconds
- **Now Playing Banner**: Shows current Spotify track
- **Auto Token Refresh**: Handles expired tokens automatically
- **Fallback**: Works without Spotify configuration

### Design System

- **Neon-Noir Aesthetic**: Deep midnight navy (#0a0a14) background
- **Hot Pink Headlines**: Glowing text with electric blue halo effect
- **Vertical Accent Lines**: Cyan and magenta gradient lines
- **Responsive Layout**: Mobile-first design approach
- **Dark Theme**: Optimized for nighttime viewing

## Deployment

### Prerequisites

- Manus account with web hosting enabled
- Custom domain (optional)

### Deployment Steps

1. **Create Checkpoint**:
   ```bash
   # Via Management UI: Click "Publish" button
   ```

2. **Configure Domain** (optional):
   - Management UI → Settings → Domains
   - Add custom domain or use auto-generated domain

3. **Set Secrets** (if needed):
   - Management UI → Settings → Secrets
   - Add any additional environment variables

4. **Publish**:
   - Click "Publish" button in Management UI
   - Wait for deployment to complete

### Production Considerations

- **Database**: Ensure MySQL/TiDB is accessible from production
- **S3 Storage**: Verify S3 credentials are configured
- **SSL/TLS**: Automatically enabled for all domains
- **Monitoring**: Use Management UI Dashboard for analytics
- **Backups**: Enable automatic database backups

## Troubleshooting

### Issue: Audio files not uploading

**Solution**: 
- Check file format (MP3, WAV, OGG, FLAC supported)
- Verify file size is under 500MB
- Check S3 storage credentials
- Review server logs in Management UI

### Issue: Spotify integration not working

**Solution**:
- Verify Spotify credentials are correct
- Check that refresh token is valid
- Ensure OAuth redirect URI matches configuration
- Review API rate limits (60 requests/minute)

### Issue: Database connection errors

**Solution**:
- Verify DATABASE_URL environment variable
- Check MySQL/TiDB server is running
- Ensure network connectivity
- Review database credentials

### Issue: Slow performance

**Solution**:
- Clear browser cache
- Check network connection
- Verify database query performance
- Monitor S3 transfer speeds
- Consider enabling CDN for static assets

## Security

### Best Practices

1. **Authentication**: All user-specific operations require login
2. **Authorization**: Users can only delete their own tracks (admins can delete any)
3. **File Validation**: Uploaded files are validated for format and size
4. **Input Sanitization**: All user inputs are validated and sanitized
5. **HTTPS**: All connections use SSL/TLS encryption
6. **Secrets Management**: Sensitive credentials stored securely

### File Upload Security

- Validate MIME type before accepting upload
- Limit file size to prevent abuse
- Scan uploaded files for malware (recommended)
- Store files in isolated S3 bucket

## Performance Optimization

### Frontend

- **Code Splitting**: Lazy load components
- **Image Optimization**: Use optimized image formats
- **Caching**: Leverage browser caching for static assets
- **Minification**: Automatic minification in production build

### Backend

- **Database Indexing**: Indexes on frequently queried columns
- **Query Optimization**: Use efficient database queries
- **Caching**: Cache Spotify API responses
- **Rate Limiting**: Implement rate limits for API endpoints

## Monitoring & Logging

### Available Metrics

- **Dashboard**: View analytics in Management UI
- **Error Logs**: Check `.manus-logs/` directory during development
- **Performance**: Monitor response times and error rates
- **Storage**: Track S3 usage and costs

### Log Files (Development)

- `devserver.log`: Server startup and runtime logs
- `browserConsole.log`: Client-side console output
- `networkRequests.log`: HTTP request logs
- `sessionReplay.log`: User interaction events

## Support & Resources

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Project README**: See `README.md`
- **Manus Documentation**: https://docs.manus.im
- **Spotify API Docs**: https://developer.spotify.com/documentation

## License

This project is provided as-is for personal and commercial use.

## Changelog

### Version 1.0.0 (Initial Release)

- ✅ Complete music player with HTML5 audio controls
- ✅ Local audio file upload and management
- ✅ Spotify "Now Playing" integration
- ✅ Cinematic neon-noir design system
- ✅ Responsive mobile/tablet/desktop layout
- ✅ User authentication and authorization
- ✅ Comprehensive test coverage
- ✅ Production-ready deployment

---

**Last Updated**: July 2026  
**Maintained By**: Manus Team
