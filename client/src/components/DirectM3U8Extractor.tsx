import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Play, Clipboard, Check, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function DirectM3U8Extractor() {
  const [m3u8Url, setM3U8Url] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Define type for extraction URL API response
  interface ExtractionUrlResponse {
    success: boolean;
    url: string;
  }

  // Fetch the current extraction URL from the server
  const { data: extractionUrlData } = useQuery<ExtractionUrlResponse>({
    queryKey: ['/api/config/extraction-url'],
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get the current extraction URL from the config
  const extractionUrl = extractionUrlData?.url || 'https://oplij.koyeb.app/api/v1/getStream';

  // Automatically fetch the URL when credentials in Code Generator change
  useEffect(() => {
    const checkForCredentials = () => {
      const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
      const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
      
      if (fileIdInput && apiKeyInput && fileIdInput.value && apiKeyInput.value) {
        fetchM3U8WithCredentials(fileIdInput.value, apiKeyInput.value);
      }
    };

    // Check initially
    checkForCredentials();

    // Setup listeners to detect changes in the Code Generator fields
    const setupChangeListeners = () => {
      const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
      const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
      
      if (fileIdInput && apiKeyInput) {
        const handleFileIdChange = () => checkForCredentials();
        const handleApiKeyChange = () => checkForCredentials();
        
        fileIdInput.addEventListener('input', handleFileIdChange);
        apiKeyInput.addEventListener('input', handleApiKeyChange);
        
        return () => {
          fileIdInput.removeEventListener('input', handleFileIdChange);
          apiKeyInput.removeEventListener('input', handleApiKeyChange);
        };
      }
      
      return () => {};
    };
    
    const cleanup = setupChangeListeners();
    return cleanup;
  }, [extractionUrl]); // Re-run effect when the extractionUrl changes

  // Fetch the M3U8 URL using the provided credentials
  const fetchM3U8WithCredentials = async (fileId: string, apiKey: string) => {
    if (!fileId || !apiKey) return;
    
    setIsLoading(true);
    
    try {
      // Make sure extractionUrl is a string
      const apiUrl = typeof extractionUrl === 'string' ? extractionUrl : 'https://oplij.koyeb.app/api/v1/getStream';
      
      const response = await fetch(apiUrl, {
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
        
        await navigator.clipboard.writeText(directUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        
        toast({
          title: "Direct URL ready",
          description: "Stream URL extracted and copied to clipboard",
        });
      } else {
        // Clear any previous URL when extraction fails
        setM3U8Url("");
        console.error("API response doesn't have success or link property");
        toast({
          title: "Extraction failed",
          description: "Could not extract stream URL from the response",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Clear any previous URL when extraction fails
      setM3U8Url("");
      console.error("Error fetching direct URL:", error);
      toast({
        title: "Extraction failed",
        description: `Error connecting to extraction service: ${extractionUrl}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy the URL to clipboard
  const copyToClipboard = async () => {
    if (!m3u8Url) {
      toast({
        title: "No URL available",
        description: "Please enter credentials in the Code Generator section first",
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
        description: "Stream URL copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Copy failed",
        description: "Please try again or copy manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Direct Stream URL</h2>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-gray-600">Getting direct URL...</span>
            </div>
          ) : m3u8Url ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-700">Direct Stream URL:</h3>
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
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>Enter credentials in the Code Generator</p>
              <p className="text-sm mt-1">The URL will appear here automatically</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}