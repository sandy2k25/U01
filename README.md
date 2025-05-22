# Media Credentials Management Tool

A sophisticated media credentials management tool with advanced Telegram bot integration, focusing on secure URL extraction and dynamic administrative controls for video playback.

## Deployment on Vercel

This project is configured for easy deployment on Vercel.

### Prerequisites

1. Create a Vercel account at [vercel.com](https://vercel.com)
2. Fork or push this repository to GitHub, GitLab, or Bitbucket

### Deployment Steps

1. **From the Vercel Dashboard:**
   - Click "Add New" → "Project"
   - Select your repository
   - Configure project settings:
     - Framework Preset: Other
     - Build Command: `npm run build` 
     - Install Command: `npm install`
     - Output Directory: `dist/public`

2. **Set Environment Variables:**
   Under the "Environment Variables" section in your Vercel project settings, add:
   
   - `ADMIN_API_KEY`: Your admin password/key
   - `ADMIN_BOT_TOKEN`: Your Telegram admin bot token
   - `USER_BOT_TOKEN`: Your Telegram user bot token
   - `DEFAULT_EXTRACTION_URL`: Your extraction service URL
     - Default: https://oplij.koyeb.app/api/v1/getStream

3. **Deploy!**
   - Click "Deploy" and Vercel will build and deploy your project
   - Your app will be available at `your-project.vercel.app`

### Working with Environment Variables

This project relies on environment variables for secure configuration. If you're experiencing issues with variables not being recognized:

1. Double-check your variable names in the Vercel dashboard
2. Redeploy the project after setting variables
3. Remember that environment variables are case-sensitive

### Features

- Secure media credentials management
- Telegram bot integration
- Admin panel for configuration
- Secure video player
- URL extraction utilities

## Local Development

1. Clone the repository
2. Create a `.env.local` file with the same variables listed above
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server
5. Visit `http://localhost:5000` in your browser