import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function AdminSettings() {
  const [apiKey, setApiKey] = useState("");
  const [extractionUrl, setExtractionUrl] = useState("");
  // Admin bot state
  const [botToken, setBotToken] = useState("");
  const [botEnabled, setBotEnabled] = useState(false);
  // User bot state
  const [userBotToken, setUserBotToken] = useState("");
  const [userBotEnabled, setUserBotEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to check if API key is valid
  const validateApiKey = async () => {
    try {
      const response = await fetch("/api/admin/config", {
        headers: {
          "x-api-key": apiKey
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        return true;
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid API key",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Error validating API key:", error);
      toast({
        title: "Authentication Error",
        description: "Could not validate API key",
        variant: "destructive"
      });
      return false;
    }
  };

  // Function to fetch config data when authenticated
  const fetchConfigData = async () => {
    if (!isAuthenticated) return;
    
    try {
      // Fetch all config settings
      const response = await fetch("/api/admin/config", {
        headers: {
          "x-api-key": apiKey
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update state with fetched config
        const configs = data.configs || [];
        
        // Find extraction URL config
        const extractionUrlConfig = configs.find((c: any) => c.key === "extractionUrl");
        if (extractionUrlConfig) {
          setExtractionUrl(extractionUrlConfig.value);
        }
        
        // Find Admin bot settings
        const adminBotEnabledConfig = configs.find((c: any) => c.key === "adminBotEnabled");
        if (adminBotEnabledConfig) {
          setBotEnabled(adminBotEnabledConfig.value === "true");
        }
        
        const adminBotTokenConfig = configs.find((c: any) => c.key === "adminBotToken");
        if (adminBotTokenConfig) {
          setBotToken(adminBotTokenConfig.value);
        }
        
        // Find User bot settings
        const userBotEnabledConfig = configs.find((c: any) => c.key === "userBotEnabled");
        if (userBotEnabledConfig) {
          setUserBotEnabled(userBotEnabledConfig.value === "true");
        }
        
        const userBotTokenConfig = configs.find((c: any) => c.key === "userBotToken");
        if (userBotTokenConfig) {
          setUserBotToken(userBotTokenConfig.value);
        }
      }
    } catch (error) {
      console.error("Error fetching config data:", error);
    }
  };

  // Handle API key submission
  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateApiKey();
    
    if (isValid) {
      fetchConfigData();
      toast({
        title: "Authentication Successful",
        description: "You now have access to admin settings"
      });
    }
  };

  // Mutation for updating extraction URL
  const updateExtractionUrl = useMutation({
    mutationFn: async () => {
      return fetch("/api/admin/config/extraction-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          url: extractionUrl
        })
      }).then(res => {
        if (!res.ok) throw new Error("Failed to update extraction URL");
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "URL Updated",
        description: "Extraction URL has been updated successfully"
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/config/extraction-url'] });
    },
    onError: (error) => {
      console.error("Error updating extraction URL:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update extraction URL",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating Telegram bot settings
  const updateTelegramSettings = useMutation({
    mutationFn: async () => {
      return fetch("/api/admin/config/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          enabled: botEnabled,
          token: botToken
        })
      }).then(res => {
        if (!res.ok) throw new Error("Failed to update Telegram bot settings");
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Bot Settings Updated",
        description: `Telegram bot has been ${botEnabled ? "enabled" : "disabled"}`
      });
    },
    onError: (error) => {
      console.error("Error updating Telegram bot settings:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update Telegram bot settings",
        variant: "destructive"
      });
    }
  });

  // Handle extraction URL update
  const handleExtractionUrlUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateExtractionUrl.mutate();
  };

  // Handle Telegram bot settings update
  const handleTelegramSettingsUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateTelegramSettings.mutate();
  };

  // Function to manually start the Telegram bots
  const startBots = async () => {
    try {
      const response = await fetch("/api/admin/start-bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to start bots");
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Bots Started",
          description: data.messages.join(", "),
        });
        
        // Refresh config data
        fetchConfigData();
      } else {
        toast({
          title: "Failed to Start Bots",
          description: data.error || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error starting bots:", error);
      toast({
        title: "Error",
        description: "Failed to start Telegram bots",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href="/" className="flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Link>
      
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Settings className="mr-2 h-8 w-8" />
        Admin Settings
      </h1>
      
      {isAuthenticated && (
        <Button 
          onClick={startBots}
          className="mb-6 bg-green-600 hover:bg-green-700 text-white"
        >
          Start Telegram Bots Now
        </Button>
      )}
      
      {!isAuthenticated ? (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <form onSubmit={handleApiKeySubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">Admin API Key</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your admin API key"
                  className="mt-1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Default key for testing: <code className="bg-gray-100 px-1 py-0.5 rounded">admin-key-123</code>
                </p>
              </div>
              <Button type="submit" className="w-full">
                Authenticate
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          {/* Extraction URL Settings */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Extraction URL Settings</h2>
            <form onSubmit={handleExtractionUrlUpdate}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="extractionUrl">Extraction API URL</Label>
                  <Input
                    id="extractionUrl"
                    type="url"
                    value={extractionUrl}
                    onChange={(e) => setExtractionUrl(e.target.value)}
                    placeholder="https://example.com/api/v1/getStream"
                    className="mt-1"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This URL will be used for all extraction requests
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={updateExtractionUrl.isPending}
                  className="flex items-center"
                >
                  {updateExtractionUrl.isPending ? (
                    <span>Updating...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save URL
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
          
          {/* Admin Telegram Bot Settings */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Admin Telegram Bot</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              // Update admin bot settings
              fetch("/api/admin/config/admin-bot", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": apiKey
                },
                body: JSON.stringify({
                  enabled: botEnabled,
                  token: botToken
                })
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error("Failed to update admin bot settings");
                }
                return response.json();
              })
              .then(() => {
                toast({
                  title: "Admin Bot Updated",
                  description: `Admin Telegram bot has been ${botEnabled ? "enabled" : "disabled"}`
                });
              })
              .catch(error => {
                console.error("Error updating admin bot settings:", error);
                toast({
                  title: "Update Failed",
                  description: "Failed to update admin bot settings",
                  variant: "destructive"
                });
              });
            }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="adminBotEnabled">Enable Admin Bot</Label>
                    <p className="text-sm text-gray-500">
                      Controls extraction URL via Telegram
                    </p>
                  </div>
                  <Switch
                    id="adminBotEnabled"
                    checked={botEnabled}
                    onCheckedChange={setBotEnabled}
                  />
                </div>
                
                <div>
                  <Label htmlFor="adminBotToken">Admin Bot Token</Label>
                  <Input
                    id="adminBotToken"
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Enter your admin Telegram bot token"
                    className="mt-1"
                    required={botEnabled}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Create a bot with @BotFather on Telegram to get a token
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Admin Bot
                </Button>
              </div>
            </form>
          </Card>
          
          {/* User Telegram Bot Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">User Telegram Bot</h2>
            <p className="text-sm text-gray-600 mb-4">
              This bot allows users to get direct stream URLs by sending IMDB IDs
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              // Update user bot settings
              fetch("/api/admin/config/user-bot", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": apiKey
                },
                body: JSON.stringify({
                  enabled: userBotEnabled,
                  token: userBotToken
                })
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error("Failed to update user bot settings");
                }
                return response.json();
              })
              .then(() => {
                toast({
                  title: "User Bot Updated",
                  description: `User Telegram bot has been ${userBotEnabled ? "enabled" : "disabled"}`
                });
              })
              .catch(error => {
                console.error("Error updating user bot settings:", error);
                toast({
                  title: "Update Failed",
                  description: "Failed to update user bot settings",
                  variant: "destructive"
                });
              });
            }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="userBotEnabled">Enable User Bot</Label>
                    <p className="text-sm text-gray-500">
                      Let users extract URLs with IMDB IDs
                    </p>
                  </div>
                  <Switch
                    id="userBotEnabled"
                    checked={userBotEnabled}
                    onCheckedChange={setUserBotEnabled}
                  />
                </div>
                
                <div>
                  <Label htmlFor="userBotToken">User Bot Token</Label>
                  <Input
                    id="userBotToken"
                    type="password"
                    value={userBotToken}
                    onChange={(e) => setUserBotToken(e.target.value)}
                    placeholder="Enter your user Telegram bot token"
                    className="mt-1"
                    required={userBotEnabled}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Create a different bot with @BotFather for user interactions
                  </p>
                </div>
                
                <Button 
                  type="submit"
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save User Bot
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}