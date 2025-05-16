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
      
      // Handle rate limiting errors first (these are often not JSON)
      if (responseText.includes("Too many requests")) {
        return { url: null, error: "The extraction service is temporarily unavailable due to rate limiting. Please try again in a few minutes." };
      }
      
      // Try to parse the response as JSON
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.log(`Response is not valid JSON: ${responseText}`);
        return { url: null, error: `Invalid response: ${responseText}` };
      }
      
      console.log(`Parsed extraction response:`, data);
      
      // The most important check: if data has a numeric link of 10, treat as no content available
      if (data && data.success && data.data && data.data.link === 10) {
        return { url: null, error: "Content not available: This movie or show isn't currently available in the streaming service." };
      }
      
      // If it has any other valid link, return it as a string
      if (data && data.success && data.data && data.data.link) {
        const linkValue = data.data.link;
        // Handle both string and numeric links by converting to string
        return { url: linkValue.toString() };
      }
      
      // Handle other error cases
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
        
        // Helper function to add delay 
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        // First attempt: Try direct IMDB ID as fileId
        let result = await this.attemptExtraction(extractionUrl, imdbId);
        
        // If we hit a rate limit on the first attempt, inform the user and exit
        if (result.error && (result.error.includes("rate limiting") || result.error.includes("Too many requests"))) {
          this.bot?.sendMessage(chatId, 
            `⚠️ The extraction service is currently rate limited.\n\n` +
            `Please try again in a few minutes when the service has recovered.`
          );
          return;
        }
        
        // If we get error code 10 (content not available) directly, no need to try other formats
        if (result.error && result.error.includes("Content not available")) {
          this.bot?.sendMessage(
            chatId,
            `❌ Could not find stream URL for ${imdbId}.\n\n` +
            `${result.error}\n\n` +
            `Please try another IMDB ID.`
          );
          return;
        }
        
        // Only try alternative formats if we didn't get a URL and didn't hit rate limits
        if (!result.url) {
          await delay(2000); // Add larger delay between requests
          const fileIdWithTilde = `~${imdbId}`;
          
          // Check if we should continue or if we already know content isn't available
          const tildePrefixResult = await this.attemptExtraction(extractionUrl, fileIdWithTilde);
          
          // Check for rate limiting on the second attempt
          if (tildePrefixResult.error && (tildePrefixResult.error.includes("rate limiting") || 
              tildePrefixResult.error.includes("Too many requests"))) {
            this.bot?.sendMessage(chatId, 
              `⚠️ The extraction service is currently rate limited.\n\n` +
              `Please try again in a few minutes when the service has recovered.`
            );
            return;
          }
          
          // If we got a URL with this format, use it
          if (tildePrefixResult.url) {
            result = tildePrefixResult;
          }
          // If we got error code 10, no need to try the third format
          else if (tildePrefixResult.error && tildePrefixResult.error.includes("Content not available")) {
            result = tildePrefixResult;
          }
          // Only try third format if necessary
          else if (!tildePrefixResult.url) {
            await delay(2000); // Add larger delay between requests
            const fileIdPlaceholder = `~${imdbId.replace('tt', '')}`;
            const numberOnlyResult = await this.attemptExtraction(extractionUrl, fileIdPlaceholder);
            
            // If we got a result with the third format, use it
            if (numberOnlyResult.url || numberOnlyResult.error) {
              result = numberOnlyResult;
            }
          }
        }
        
        if (result.url) {
          // Success - Ask for language selection like the website does
          
          // Create inline keyboard for language selection
          const keyboard = {
            inline_keyboard: [
              [
                { text: '🇺🇸 English', callback_data: `lang_en_${imdbId}` },
                { text: '🇪🇸 Spanish', callback_data: `lang_es_${imdbId}` }
              ],
              [
                { text: '🇫🇷 French', callback_data: `lang_fr_${imdbId}` },
                { text: '🇩🇪 German', callback_data: `lang_de_${imdbId}` }
              ],
              [
                { text: '🇮🇹 Italian', callback_data: `lang_it_${imdbId}` },
                { text: '🇯🇵 Japanese', callback_data: `lang_jp_${imdbId}` }
              ],
              [
                { text: '🌐 Original', callback_data: `lang_original_${imdbId}` }
              ]
            ]
          };
          
          this.bot?.sendMessage(
            chatId,
            `✅ Found stream for ${imdbId}!\n\nPlease select your preferred language:`, 
            { reply_markup: keyboard }
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
    
    // Handle language selection callbacks
    this.bot.on('callback_query', async (callbackQuery) => {
      if (!callbackQuery.data || !callbackQuery.message) return;
      
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      
      // Check if this is a language selection callback
      if (data.startsWith('lang_')) {
        try {
          // Extract language and IMDB ID
          const parts = data.split('_');
          if (parts.length < 3) return;
          
          const language = parts[1];
          const imdbId = parts.slice(2).join('_'); // In case the IMDB ID contains underscores
          
          // Get the extraction URL from storage
          const extractionUrl = await this.storage.getConfigByKey("extractionUrl");
          
          if (!extractionUrl) {
            this.bot?.sendMessage(chatId, 'Extraction service URL is not configured. Please contact admin.');
            return;
          }
          
          // Get the stream URL (reusing the most successful format)
          const result = await this.attemptExtraction(extractionUrl, imdbId);
          
          if (result.url) {
            // Answer the callback query to stop the loading indicator
            this.bot?.answerCallbackQuery(callbackQuery.id, { text: `Selected: ${language}` });
            
            // Send the stream URL with the selected language
            this.bot?.sendMessage(
              chatId,
              `🎬 Stream URL for ${imdbId} (${language}):\n\n${result.url}\n\n` +
              `🔊 Selected language: ${language}\n` +
              `🎯 Direct link ready to use in any player`
            );
          } else {
            // If we fail to get the URL again
            this.bot?.answerCallbackQuery(callbackQuery.id, { text: "Failed to get stream URL" });
            this.bot?.sendMessage(
              chatId, 
              `❌ Error retrieving the stream URL. Please try again later.`
            );
          }
        } catch (error) {
          console.error('Error processing language selection:', error);
          this.bot?.answerCallbackQuery(callbackQuery.id, { text: "Error processing request" });
          this.bot?.sendMessage(
            chatId,
            `❌ Error processing your language selection. Please try again.`
          );
        }
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