# Media Extraction and Streaming API Tools

A powerful toolkit for extracting and playing media streams with Telegram bot integration.

## Features

- **File Search**: Search for files using title or ID
- **ID Conversion**: Convert between TID and IID
- **Advanced M3U8 Player**: Built-in player with playback controls
- **Multiple Playback Options**: Support for external players (VLC, PotPlayer, etc.)
- **Telegram Bot Integration**: Remote file URL extraction

## Project Structure

```
├── client/ - Frontend React application
│   ├── src/
│   │   ├── components/ - React components 
│   │   ├── hooks/ - Custom React hooks
│   │   ├── lib/ - Utility functions
│   │   ├── pages/ - Page components
├── server/ - Backend Express server
│   ├── index.ts - Server entry point
│   ├── routes.ts - API routes
│   ├── storage.ts - Data storage layer
│   ├── telegramBot.ts - Telegram bot functionality
├── shared/ - Shared code between frontend and backend
│   ├── schema.ts - Data schemas
```

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create `.env` file with the following variables:
   ```
   # API Keys
   TMDB_API_KEY=your_tmdb_api_key
   ADMIN_API_KEY=your_admin_key
   
   # Telegram Bot Tokens
   ADMIN_BOT_TOKEN=your_admin_bot_token
   USER_BOT_TOKEN=your_user_bot_token
   ```

### Running Locally

```
npm run dev
```

### Deploying to Vercel

This project is configured for easy deployment to Vercel:

1. Push code to a GitHub repository
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## API Endpoints

### Media Information

- `GET /api/tmdb-to-imdb/:tmdbId` - Convert TID to IID

### Configuration

- `GET /api/config/extraction-url` - Get current extraction URL
- `POST /api/admin/config/extraction-url` - Update extraction URL (admin only)
- `GET /api/admin/config` - Get all config settings (admin only)

### Telegram Bot Management

- `POST /api/admin/start-bots` - Start both Telegram bots (admin only)
- `POST /api/admin/config/admin-bot` - Update Admin bot settings (admin only)
- `POST /api/admin/config/user-bot` - Update User bot settings (admin only)

## Sketchware Integration

To integrate with Sketchware:

1. Deploy the application using Vercel or another hosting service
2. Use the deployed URL in your Sketchware app
3. Make API calls to the endpoints described above
4. Handle responses in your Sketchware app logic

### Example Sketchware Usage

1. Call API endpoints from your Sketchware app
2. Parse the JSON response
3. Display file information and stream URLs in your UI
4. Use WebView for integrated playback or external intent for external players

## Security

- API keys and File IDs are visually blurred in the interface
- Admin routes are protected with API key authentication
- Sensitive data is not exposed in client-side code

## Telegram Bot Commands

### User Bot
- `/start` - Start interaction with the bot
- `/help` - Get help on using the bot

### Admin Bot
- `/start` - Start interaction with admin bot
- `/geturl` - Get the current extraction URL
- `/seturl [new-url]` - Set a new extraction URL
- `/status` - Check bot status
- `/authorize [user-id]` - Add an admin