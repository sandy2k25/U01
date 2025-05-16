import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Play, Clipboard, Check, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DirectM3U8Extractor() {
  const [fileId, setFileId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [m3u8Url, setM3U8Url] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Directly fetch the M3U8 URL
  const fetchM3U8Url = async () => {
    if (!fileId.trim() || !apiKey.trim()) {
      toast({
        title: "Missing credentials",
        description: "Please enter both a File ID and API Key",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setM3U8Url("");

    try {
      // Make the API request directly
      const response = await fetch('https://oplij.koyeb.app/api/v1/getStream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: fileId,
          key: apiKey
        })
      });

      const data = await response.json();

      if (data.success && data.data && data.data.link) {
        const directUrl = data.data.link;
        setM3U8Url(directUrl);
        
        // Auto-copy to clipboard
        await navigator.clipboard.writeText(directUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        
        toast({
          title: "URL extracted and copied",
          description: "The M3U8 URL has been extracted and copied to clipboard",
        });
      } else {
        toast({
          title: "URL not found",
          description: "Could not extract M3U8 URL from the API response",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching M3U8 URL:", error);
      toast({
        title: "Request failed",
        description: "Failed to fetch the M3U8 URL from the API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    if (!m3u8Url) {
      toast({
        title: "No URL to copy",
        description: "Please fetch the M3U8 URL first",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(m3u8Url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "URL copied",
        description: "The M3U8 URL has been copied to your clipboard",
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Copy failed",
        description: "Failed to copy URL to clipboard",
        variant: "destructive",
      });
    }
  };

  // Use File ID and API Key from Code Generator if available
  const useFromCodeGenerator = () => {
    const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
    const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
    
    if (fileIdInput && apiKeyInput) {
      setFileId(fileIdInput.value);
      setApiKey(apiKeyInput.value);
      
      toast({
        title: "Values imported",
        description: "File ID and API Key imported from Code Generator",
      });
    } else {
      toast({
        title: "Import failed",
        description: "Could not find values from Code Generator",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Direct M3U8 URL Extractor</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 md:col-span-1">
              <Input
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="File ID"
              />
            </div>
            <div className="col-span-3 md:col-span-1">
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="API Key"
              />
            </div>
            <div className="col-span-3 md:col-span-1">
              <Button
                onClick={useFromCodeGenerator}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Use from Generator</span>
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={fetchM3U8Url}
            className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200"
            disabled={isLoading || !fileId.trim() || !apiKey.trim()}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fetching M3U8 URL...
              </span>
            ) : (
              <span>Get Direct M3U8 URL</span>
            )}
          </Button>
          
          {m3u8Url && (
            <div className="mt-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-700">Direct M3U8 URL:</h3>
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="sm"
                  className={`text-sm flex items-center ${isCopied ? 'text-green-600' : 'text-gray-700'}`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 break-all mb-2">
                <code className="text-sm font-mono text-gray-800">{m3u8Url}</code>
              </div>
              
              <div className="flex justify-end">
                <a 
                  href={m3u8Url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:text-blue-700 font-medium"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Test Stream
                </a>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-3 rounded-md text-xs border border-gray-200 mt-2">
            <p className="text-gray-600">
              This tool directly extracts the M3U8 URL without requiring console access. Enter your credentials and click the button to get the direct streaming URL.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}