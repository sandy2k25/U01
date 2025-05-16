import TelegramBotAPI from 'node-telegram-bot-api';
import { IStorage } from './storage';

// List of authorized Telegram user IDs who can use the bot
// This could be moved to the database/config in a production environment
const AUTHORIZED_USERS: number[] = [];

export class TelegramBot {
  private bot: TelegramBotAPI | null = null;
  private token: string;
  private storage: IStorage;
  private isRunning: boolean = false;

  constructor(token: string, storage: IStorage) {
    this.token = token;
    this.storage = storage;
  }

  // Start the Telegram bot
  public start(): void {
    if (this.isRunning) {
      return;
    }

    try {
      // Create a new bot instance
      this.bot = new TelegramBotAPI(this.token, { polling: true });
      this.isRunning = true;

      console.log('Telegram bot started');

      // Register message handlers
      this.registerHandlers();
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
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
      console.log('Telegram bot stopped');
    } catch (error) {
      console.error('Error stopping Telegram bot:', error);
    }
  }

  // Register message handlers
  private registerHandlers(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      // Check if user is authorized
      if (userId && AUTHORIZED_USERS.length > 0 && !AUTHORIZED_USERS.includes(userId)) {
        this.bot?.sendMessage(chatId, 'Unauthorized access. Please contact the administrator.');
        return;
      }

      this.bot?.sendMessage(
        chatId,
        `Welcome to the Extraction URL Manager Bot!\n\n` +
        `Commands:\n` +
        `/geturl - Get the current extraction URL\n` +
        `/seturl [new-url] - Set a new extraction URL\n` +
        `/status - Check bot status`
      );
    });

    // Handle /geturl command - Get the current extraction URL
    this.bot.onText(/\/geturl/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;

      // Check if user is authorized
      if (userId && AUTHORIZED_USERS.length > 0 && !AUTHORIZED_USERS.includes(userId)) {
        this.bot?.sendMessage(chatId, 'Unauthorized access. Please contact the administrator.');
        return;
      }

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

      // Check if user is authorized
      if (userId && AUTHORIZED_USERS.length > 0 && !AUTHORIZED_USERS.includes(userId)) {
        this.bot?.sendMessage(chatId, 'Unauthorized access. Please contact the administrator.');
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
      const userId = msg.from?.id;

      // Check if user is authorized
      if (userId && AUTHORIZED_USERS.length > 0 && !AUTHORIZED_USERS.includes(userId)) {
        this.bot?.sendMessage(chatId, 'Unauthorized access. Please contact the administrator.');
        return;
      }

      try {
        const extractionUrl = await this.storage.getConfigByKey("extractionUrl");
        this.bot?.sendMessage(
          chatId,
          `Bot Status: Running\n` +
          `Current Extraction URL: ${extractionUrl}\n` +
          `Authorized Users: ${AUTHORIZED_USERS.length > 0 ? AUTHORIZED_USERS.join(', ') : 'All users'}`
        );
      } catch (error) {
        console.error('Error getting bot status:', error);
        this.bot?.sendMessage(chatId, 'Error checking bot status. Please try again later.');
      }
    });

    // Handle /authorize command - Add a user to authorized users
    this.bot.onText(/\/authorize (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from?.id;
      
      // Only the first user to use this command will be considered an admin
      // or existing authorized users
      if (AUTHORIZED_USERS.length > 0 && !AUTHORIZED_USERS.includes(userId || 0)) {
        this.bot?.sendMessage(chatId, 'Only authorized users can add new users.');
        return;
      }
      
      // Extract the user ID from the message
      const newUserId = match ? parseInt(match[1].trim()) : 0;
      
      if (!newUserId) {
        this.bot?.sendMessage(chatId, 'Please provide a valid user ID. Example: /authorize 123456789');
        return;
      }
      
      // Add the user ID to authorized users if not already present
      if (!AUTHORIZED_USERS.includes(newUserId)) {
        AUTHORIZED_USERS.push(newUserId);
        this.bot?.sendMessage(chatId, `User ${newUserId} added to authorized users.`);
      } else {
        this.bot?.sendMessage(chatId, `User ${newUserId} is already authorized.`);
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
          '/status - Check bot status'
        );
      }
    });
  }
}