import TelegramBotAPI from 'node-telegram-bot-api';
import { IStorage } from './storage';
import fetch from 'node-fetch';

// Base TelegramBot class that can be extended by specific implementations
export abstract class TelegramBot {
  protected bot: TelegramBotAPI | null = null;
  protected token: string;
  protected storage: IStorage;
  protected isRunning: boolean = false;
  protected botType: string;

  constructor(token: string, storage: IStorage, botType: string) {
    this.token = token;
    this.storage = storage;
    this.botType = botType;
  }

  // Start the Telegram bot
  public start(): void {
    if (this.isRunning || !this.token) {
      return;
    }

    try {
      // Create a new bot instance
      this.bot = new TelegramBotAPI(this.token, { polling: true });
      this.isRunning = true;

      console.log(`${this.botType} Telegram bot started`);

      // Register message handlers
      this.registerHandlers();
    } catch (error) {
      console.error(`Failed to start ${this.botType} Telegram bot:`, error);
      this.isRunning = false;
      this.bot = null;
    }
  }

  // Stop the Telegram bot
  public stop(): void {
    if (!this.isRunning || !this.bot) {
      return;
    }

    try {
      // Stop the bot polling
      this.bot.stopPolling();
      this.isRunning = false;
      this.bot = null;
      console.log(`${this.botType} Telegram bot stopped`);
    } catch (error) {
      console.error(`Error stopping ${this.botType} Telegram bot:`, error);
    }
  }

  // Abstract method to be implemented by specific bot types
  protected abstract registerHandlers(): void;
}

// Admin Telegram Bot for managing the extraction URL
export class AdminTelegramBot extends TelegramBot {
  // List of authorized admin user IDs
  private authorizedAdmins: number[] = [];

  constructor(token: string, storage: IStorage) {
    super(token, storage, 'Admin');
  }

  // Register admin-specific handlers
  protected registerHandlers(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;

      this.bot?.sendMessage(
        chatId,
        `Welcome to the Admin Bot!\n\n` +
        `Commands:\n` +
        `/geturl - Get the current extraction URL\n` +
        `/seturl [new-url] - Set a new extraction URL\n` +
        `/status - Check bot status\n` +
        `/authorize [user-id] - Add an admin`
      );
    });

    // Handle /geturl command - Get the current extraction URL
    this.bot.onText(/\/geturl/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const extractionUrl = await this.storage.getConfigByKey("extractionUrl");
        this.bot?.sendMessage(chatId, `Current extraction URL:\n${extractionUrl}`);
      } catch (error) {
        console.error('Error getting extraction URL:', error);
        this.bot?.sendMessage(chatId, 'Error getting extraction URL. Please try again later.');
      }
    });

    // Handle /seturl command - Set a new extraction URL
    this.bot.onText(/\/seturl (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      // Check if user is authorized when list is not empty
      if (this.authorizedAdmins.length > 0 && !this.authorizedAdmins.includes(userId || 0)) {
        this.bot?.sendMessage(chatId, 'Only authorized admins can change the URL.');
        return;
      }

      // Extract the URL from the message
      const newUrl = match ? match[1].trim() : '';

      if (!newUrl) {
        this.bot?.sendMessage(chatId, 'Please provide a valid URL. Example: /seturl https://example.com/api');
        return;
      }

      try {
        // Check if the URL is valid
        new URL(newUrl);

        // Update the extraction URL
        await this.storage.setConfig("extractionUrl", newUrl);
        this.bot?.sendMessage(chatId, `Extraction URL updated successfully to:\n${newUrl}`);
      } catch (error) {
        console.error('Error updating extraction URL:', error);
        this.bot?.sendMessage(chatId, 'Invalid URL format or server error. Please provide a valid URL.');
      }
    });

    // Handle /status command - Check bot status
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const extractionUrl = await this.storage.getConfigByKey("extractionUrl");
        this.bot?.sendMessage(
          chatId,
          `Admin Bot Status: Running\n` +
          `Current Extraction URL: ${extractionUrl}\n` +
          `Authorized Admins: ${this.authorizedAdmins.length > 0 ? this.authorizedAdmins.join(', ') : 'All users'}`
        );
      } catch (error) {
        console.error('Error getting bot status:', error);
        this.bot?.sendMessage(chatId, 'Error checking bot status. Please try again later.');
      }
    });

    // Handle /authorize command - Add a user as admin
    this.bot.onText(/\/authorize (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      // Only existing authorized admins can add new admins (or the first user if list is empty)
      if (this.authorizedAdmins.length > 0 && !this.authorizedAdmins.includes(userId || 0)) {
        this.bot?.sendMessage(chatId, 'Only authorized admins can add new admins.');
        return;
      }
      
      // Extract the user ID from the message
      const newUserId = match ? parseInt(match[1].trim()) : 0;
      
      if (!newUserId) {
        this.bot?.sendMessage(chatId, 'Please provide a valid user ID. Example: /authorize 123456789');
        return;
      }
      
      // Add the user ID to authorized admins if not already present
      if (!this.authorizedAdmins.includes(newUserId)) {
        this.authorizedAdmins.push(newUserId);
        this.bot?.sendMessage(chatId, `User ${newUserId} added as an admin.`);
      } else {
        this.bot?.sendMessage(chatId, `User ${newUserId} is already an admin.`);
      }
    });

    // Handle unknown commands
    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      
      // Ignore messages that start with / (commands are handled above)
      if (msg.text && msg.text.startsWith('/') && 
          !msg.text.startsWith('/start') && 
          !msg.text.startsWith('/geturl') && 
          !msg.text.startsWith('/seturl') && 
          !msg.text.startsWith('/status') && 
          !msg.text.startsWith('/authorize')) {
        this.bot?.sendMessage(
          chatId, 
          'Unknown command. Available commands:\n' +
          '/geturl - Get current extraction URL\n' +
          '/seturl [url] - Set a new extraction URL\n' +
          '/status - Check bot status\n' +
          '/authorize [user-id] - Add an admin'
        );
      }
    });
  }
}

// User Telegram Bot for getting direct stream URLs from IMDB IDs
export class UserTelegramBot extends TelegramBot {
  constructor(token: string, storage: IStorage) {
    super(token, storage, 'User');
  }
  
  // Helper method to attempt extraction with different fileId formats
  private async attemptExtraction(extractionUrl: string, fileId: string): Promise<{ url: string | null; error?: string }> {
    try {
      // Use a consistent API key for all user requests
      const apiKey = process.env.EXTRACTION_API_KEY || 
                    await this.storage.getConfigByKey("extractionApiKey") || 
                    'rcbeUV3KoCw-dSFJ-vN$-JwI4OXlCmOaAx05HkWyclbx46SNcazmpYmnFTXoNjo';
      
      console.log(`Attempting extraction with fileId: ${fileId}`);
      
      // Make the API request to get the stream URL
      const response = await fetch(extractionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileId,
          key: apiKey
        })
      });
      
      // Get raw text first to see exactly what's being returned
      const responseText = await response.text();
      console.log(`Raw extraction response for ${fileId}:`, responseText);
      
      // Try to parse the response as JSON
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.log(`Response is not valid JSON: ${responseText}`);
        return { url: null, error: `Invalid response: ${responseText}` };
      }
      
      console.log(`Parsed extraction response:`, data);
      
      // Check if the API request was successful and has the expected format
      if (data && data.success && data.data && data.data.link && typeof data.data.link === 'string') {
        return { url: data.data.link };
      }
      
      // Handle the case where link is numeric error code 10 (content not available)
      if (responseText === "10" || data === 10 || 
          (data && data.data && data.data.link === 10)) {
        return { url: null, error: "Error code 10: This content is not currently available. The file might be restricted or doesn't exist on the streaming service." };
      }
      
      // Handle other types of responses
      if (data && !data.success && data.error) {
        return { url: null, error: `API error: ${data.error}` };
      }
      
      return { url: null, error: "Unknown response format from extraction service" };
    } catch (error) {
      console.error(`Error in extraction attempt with fileId ${fileId}:`, error);
      return { url: null, error: `Extraction error: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  protected registerHandlers(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      
      this.bot?.sendMessage(
        chatId,
        `Welcome to the Stream URL Bot!\n\n` +
        `Just send me an IMDB ID (e.g., tt1234567) and I'll get the direct stream URL for you.\n\n` +
        `Example: tt0111161`
      );
    });

    // Handle /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      
      this.bot?.sendMessage(
        chatId,
        `This bot provides direct stream URLs for movies and TV shows.\n\n` +
        `Simply send your IMDB ID (starting with 'tt') and I'll find the stream URL for you.\n\n` +
        `Example: tt0111161`
      );
    });

    // Handle IMDB IDs (in the format tt1234567)
    this.bot.onText(/tt\d+/, async (msg, match) => {
      const chatId = msg.chat.id;
      const imdbId = match ? match[0] : '';
      
      if (!imdbId) {
        this.bot?.sendMessage(chatId, 'Please provide a valid IMDB ID (e.g., tt1234567)');
        return;
      }
      
      try {
        this.bot?.sendMessage(chatId, `🔍 Searching for stream URL for ${imdbId}...`);
        
        // Get the current extraction URL from storage
        const extractionUrl = await this.storage.getConfigByKey("extractionUrl");
        
        if (!extractionUrl) {
          this.bot?.sendMessage(chatId, 'Extraction service URL is not configured. Please contact admin.');
          return;
        }
        
        // Try different approaches for the extraction service
        
        // First attempt: Try direct IMDB ID as fileId
        let result = await this.attemptExtraction(extractionUrl, imdbId);
        
        // Second attempt: Try with a tilde prefix (some services use this format)
        if (!result.url) {
          const fileIdWithTilde = `~${imdbId}`;
          result = await this.attemptExtraction(extractionUrl, fileIdWithTilde);
        }
        
        // Third attempt: Try with standard placeholder format
        if (!result.url) {
          const fileIdPlaceholder = `~${imdbId.replace('tt', '')}`;
          result = await this.attemptExtraction(extractionUrl, fileIdPlaceholder);
        }
        
        if (result.url) {
          // Success - send the stream URL
          this.bot?.sendMessage(
            chatId, 
            `✅ Found stream URL for ${imdbId}:\n\n${result.url}`
          );
        } else {
          // All attempts failed
          const errorMessage = result.error || 'No specific error information available';
          
          this.bot?.sendMessage(
            chatId,
            `❌ Could not find stream URL for ${imdbId}.\n\nError: ${errorMessage}\n\nPlease try another IMDB ID.`
          );
        }
      } catch (error) {
        console.error('Error processing IMDB ID:', error);
        this.bot?.sendMessage(
          chatId,
          `❌ Error processing your request. Please try again later.`
        );
      }
    });

    // Handle all other messages
    this.bot.on('message', (msg) => {
      // Skip command messages as they're handled above
      if (msg.text && !msg.text.startsWith('/') && !msg.text.match(/tt\d+/)) {
        const chatId = msg.chat.id;
        this.bot?.sendMessage(
          chatId,
          `Please send me an IMDB ID starting with 'tt' followed by numbers.\n` +
          `Example: tt0111161`
        );
      }
    });
  }
}