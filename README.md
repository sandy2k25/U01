# Media Credentials Management Tool

A sophisticated media credentials management tool with advanced Telegram bot integration, focusing on secure URL extraction and dynamic administrative controls for video playback.

## Deployment on Vercel

This project is configured for easy deployment on Vercel.

### Prerequisites

1. Create a Vercel account at [vercel.com](https://vercel.com)
2. Install the Vercel CLI:
   ```
   npm i -g vercel
   ```

### Deploy Steps

1. **Connect Repository to Vercel**:
   - Push your repository to GitHub
   - Import the repository in the Vercel dashboard
   - Or use the CLI: `vercel`

2. **Set Environment Variables**:
   You'll need to set these environment variables in the Vercel dashboard:
   - `ADMIN_API_KEY`: Your admin API key
   - `ADMIN_BOT_TOKEN`: Your admin Telegram bot token
   - `USER_BOT_TOKEN`: Your user Telegram bot token
   - `DEFAULT_EXTRACTION_URL`: Your extraction API URL

3. **Deploy!**:
   - Vercel will automatically detect the configuration and deploy your app
   - Your project will be available at `your-project.vercel.app`

### Local Development

1. Copy `.env.example` to `.env` and fill in your variables
2. Run `npm run dev` to start the development server
3. Open your browser to `http://localhost:5000`

## Technologies Used

- React Frontend
- Express Backend
- Telegram Bot Integration
- Secure Media Playback
- Dynamic URL Processing