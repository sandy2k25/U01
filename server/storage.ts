import { users, type User, type InsertUser, type Config, type InsertConfig } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Config methods
  getConfigByKey(key: string): Promise<string | undefined>;
  setConfig(key: string, value: string): Promise<Config>;
  getAllConfig(): Promise<Config[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private configs: Map<string, Config>;
  currentUserId: number;
  currentConfigId: number;

  constructor() {
    this.users = new Map();
    this.configs = new Map();
    this.currentUserId = 1;
    this.currentConfigId = 1;
    
    // Initialize with default extraction URL from environment variable or use fallback
    const defaultExtractionUrl = process.env.DEFAULT_EXTRACTION_URL || "https://oplij.koyeb.app/api/v1/getStream";
    this.setConfig("extractionUrl", defaultExtractionUrl);
    
    // Initialize with default Admin Telegram bot settings
    this.setConfig("adminBotEnabled", process.env.ADMIN_BOT_TOKEN ? "true" : "false");
    this.setConfig("adminBotToken", process.env.ADMIN_BOT_TOKEN || "");
    
    // Initialize with default User Telegram bot settings
    this.setConfig("userBotEnabled", process.env.USER_BOT_TOKEN ? "true" : "false");
    this.setConfig("userBotToken", process.env.USER_BOT_TOKEN || "");
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async getConfigByKey(key: string): Promise<string | undefined> {
    const config = this.configs.get(key);
    return config?.value;
  }
  
  async setConfig(key: string, value: string): Promise<Config> {
    const existingConfig = this.configs.get(key);
    
    if (existingConfig) {
      const updatedConfig: Config = { ...existingConfig, value };
      this.configs.set(key, updatedConfig);
      return updatedConfig;
    } else {
      const id = this.currentConfigId++;
      const newConfig: Config = { id, key, value };
      this.configs.set(key, newConfig);
      return newConfig;
    }
  }
  
  async getAllConfig(): Promise<Config[]> {
    return Array.from(this.configs.values());
  }
}

export const storage = new MemStorage();
