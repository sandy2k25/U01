import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, ArrowDownRight, Code, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function ResponseUrlExtractor() {
  const [responseText, setResponseText] = useState("");
  const [extractedUrl, setExtractedUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("paste");
  const { toast } = useToast();

  // Extract URL from response
  const extractUrl = () => {
    if (!responseText.trim()) {
      toast({
        title: "Empty input",
        description: "Please paste a response first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try to parse the response text as JSON first
      try {
        const responseObject = JSON.parse(responseText);
        
        // Check for expected structure: data.link
        if (responseObject?.data?.link) {
          const url = responseObject.data.link;
          setExtractedUrl(url);
          toast({
            title: "URL extracted successfully",
            description: "URL found in data.link property",
          });
          return;
        }
        
        // Try alternative paths that might contain the URL
        // Check direct link property
        if (responseObject?.link) {
          const url = responseObject.link;
          setExtractedUrl(url);
          toast({
            title: "URL extracted successfully",
            description: "URL found in direct link property",
          });
          return;
        }
        
        // Check for stream URL
        if (responseObject?.data?.stream) {
          const url = responseObject.data.stream;
          setExtractedUrl(url);
          toast({
            title: "URL extracted successfully",
            description: "URL found in data.stream property",
          });
          return;
        }
        
        // Look for any property containing a URL-like string
        const potentialUrls = findPotentialUrls(responseObject);
        if (potentialUrls.length > 0) {
          setExtractedUrl(potentialUrls[0]);
          toast({
            title: "Potential URL found",
            description: "Found a URL-like string in the response",
          });
          return;
        }
      } catch (jsonError) {
        // Not valid JSON, try to find URL patterns directly in the text
        console.warn("Not valid JSON, searching for URL patterns");
      }
      
      // If we got here, try to extract URLs directly from the text
      const urlRegex = /(https?:\/\/[^\s'"]+)/g;
      const matches = responseText.match(urlRegex);
      
      if (matches && matches.length > 0) {
        setExtractedUrl(matches[0]);
        toast({
          title: "URL extracted directly from text",
          description: "Found a URL pattern in the pasted content",
        });
        return;
      }
      
      // If we get here, no URL was found
      toast({
        title: "URL not found",
        description: "Couldn't find a URL in the provided response",
        variant: "destructive",
      });
      
    } catch (err) {
      console.error("Error during URL extraction:", err);
      toast({
        title: "Extraction failed",
        description: "Please check your input and try again",
        variant: "destructive",
      });
    }
  };

  // Helper function to find potential URLs in a complex object
  const findPotentialUrls = (obj: any, paths: string[] = []): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    const foundUrls: string[] = [];
    
    // Loop through all properties of the object
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const currentPath = [...paths, key];
        
        // If the value is a string and looks like a URL, add it
        if (typeof value === 'string' && isLikelyUrl(value)) {
          foundUrls.push(value);
          console.log(`Found URL at: ${currentPath.join('.')}`);
        }
        
        // If the value is an object or array, recursively search it
        if (value && typeof value === 'object') {
          const nestedUrls = findPotentialUrls(value, currentPath);
          foundUrls.push(...nestedUrls);
        }
      }
    }
    
    return foundUrls;
  };

  // Check if a string is likely to be a URL
  const isLikelyUrl = (str: string): boolean => {
    return /^https?:\/\//i.test(str) && 
           (str.includes('.mp4') || 
            str.includes('.m3u8') || 
            str.includes('/stream') || 
            str.includes('/video') ||
            str.includes('/media') ||
            str.includes('/watch') ||
            str.includes('/play'));
  };

  // Handle JavaScript/console object inputs
  const handleConsoleObject = () => {
    try {
      // First, try to match the exact format described:
      // Object {success: true, data: {...}}
      // data: Object
      // link: https://example.com/video.mp4
      const browserConsoleFormat = responseText.match(/data:\s*Object\s+link:\s*([^\s\n]+)/m);
      if (browserConsoleFormat && browserConsoleFormat[1]) {
        setExtractedUrl(browserConsoleFormat[1]);
        toast({
          title: "URL extracted successfully",
          description: "Found URL from browser console format",
        });
        return;
      }
      
      // Also check alternative formats where 'link:' appears with the URL
      const linkFormat = responseText.match(/link:\s*([^\s\n,}"']+)/m);
      if (linkFormat && linkFormat[1]) {
        setExtractedUrl(linkFormat[1]);
        toast({
          title: "URL extracted successfully",
          description: "Found URL from link property",
        });
        return;
      }
      
      // Try to find pattern with quotes
      const quotedLink = responseText.match(/link:\s*["']([^"']+)["']/m);
      if (quotedLink && quotedLink[1]) {
        setExtractedUrl(quotedLink[1]);
        toast({
          title: "URL extracted successfully",
          description: "Found URL in quoted link property",
        });
        return;
      }
      
      // Try to find URL after the "link:" text on any line
      const anyLineUrl = responseText.match(/link:.*?(https?:\/\/[^\s\n"']+)/);
      if (anyLineUrl && anyLineUrl[1]) {
        setExtractedUrl(anyLineUrl[1]);
        toast({
          title: "URL extracted successfully",
          description: "Found URL on line with 'link:' text",
        });
        return;
      }
      
      // If specific patterns failed, try to extract any URL-like strings
      const urlRegex = /(https?:\/\/[^\s"'}\)]+)/g;
      const matches = responseText.match(urlRegex);
      
      if (matches && matches.length > 0) {
        setExtractedUrl(matches[0]);
        toast({
          title: "URL extracted directly",
          description: "Found URL pattern in the console output",
        });
        return;
      }
      
      // Last resort: Look for anything that might be a file path or partial URL
      const partialUrlRegex = /\/[\w\d\/\.\-\_\+\=\?\&]+\.(mp4|m3u8|ts|mov|avi|mkv|flv)/i;
      const partialMatches = responseText.match(partialUrlRegex);
      
      if (partialMatches && partialMatches.length > 0) {
        setExtractedUrl(partialMatches[0]);
        toast({
          title: "Partial URL extracted",
          description: "Found what appears to be a media file path",
        });
        return;
      }
      
      toast({
        title: "URL not found",
        description: "Couldn't find a URL in the console output. Please ensure you've copied the text exactly as shown in the console.",
        variant: "destructive",
      });
      
    } catch (err) {
      console.error("Error parsing console object:", err);
      toast({
        title: "Parsing failed",
        description: "Could not parse the console output format",
        variant: "destructive",
      });
    }
  };

  // Copy extracted URL to clipboard
  const copyUrlToClipboard = () => {
    if (!extractedUrl) {
      toast({
        title: "No URL to copy",
        description: "Please extract a URL first",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard.writeText(extractedUrl)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: "URL copied to clipboard",
          description: "You can now paste it wherever you need",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Failed to copy",
          description: "Please try again or copy manually",
          variant: "destructive",
        });
      });
  };

  const consoleExtractorCode = `
// Extract URL from API response
function extractStreamUrl(apiResponse) {
  if (!apiResponse) {
    console.error("No response object provided");
    return null;
  }
  
  try {
    // Check if it has data.link
    if (apiResponse.data && apiResponse.data.link) {
      console.log("✅ URL extracted:", apiResponse.data.link);
      return apiResponse.data.link;
    }
    
    // Check other common patterns
    if (apiResponse.link) {
      console.log("✅ URL extracted:", apiResponse.link);
      return apiResponse.link;
    }
    
    if (apiResponse.data && apiResponse.data.stream) {
      console.log("✅ URL extracted:", apiResponse.data.stream);
      return apiResponse.data.stream;
    }
    
    // Deep search for URLs in the object
    const urls = findUrlsInObject(apiResponse);
    if (urls.length > 0) {
      console.log("✅ URL found:", urls[0]);
      return urls[0]; 
    }
    
    console.error("❌ No URL found in the response object");
    return null;
    
  } catch (error) {
    console.error("Error extracting URL:", error);
    return null;
  }
}

// Helper function to find URLs in an object
function findUrlsInObject(obj, urls = []) {
  if (!obj || typeof obj !== 'object') return urls;
  
  for (const key in obj) {
    const value = obj[key];
    
    // Check if value is a string that looks like a URL
    if (typeof value === 'string' && /^https?:\\/\\//i.test(value)) {
      if (value.includes('.mp4') || value.includes('.m3u8') || 
          value.includes('/stream') || value.includes('/video') ||
          value.includes('/media')) {
        urls.push(value);
      }
    }
    
    // Recursively search nested objects
    if (value && typeof value === 'object') {
      findUrlsInObject(value, urls);
    }
  }
  
  return urls;
}

// Get the last API response from the console
// (This should be the variable name of your API response)
const lastResponse = $_;

// Extract and copy the URL to clipboard
const url = extractStreamUrl(lastResponse);
if (url) {
  navigator.clipboard.writeText(url)
    .then(() => console.log("✅ URL copied to clipboard!"))
    .catch(err => console.error("Failed to copy:", err));
} else {
  console.log("❌ Couldn't extract URL from the last response");
}
`;

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <section className="p-6">
        <h2 className="text-xl font-semibold mb-4">URL Extractor</h2>
        
        <Tabs defaultValue="script" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="script">Console Script</TabsTrigger>
            <TabsTrigger value="paste">JSON Response</TabsTrigger>
            <TabsTrigger value="console">Console Object</TabsTrigger>
          </TabsList>
          
          <TabsContent value="script" className="space-y-4">
            <div className="bg-gray-100 rounded-lg p-4 text-sm mb-2">
              <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                <Code className="h-4 w-4 mr-2" />
                Copy-Paste Console Script (Easiest Method)
              </h3>
              
              <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                <li>After running your API request in the browser console, you'll see a response like <code className="bg-gray-200 px-1 rounded">Object {'{'}success: true, data: {...}{'}'}...</code></li>
                <li>Click the copy button below to copy this script</li>
                <li>Paste and run it in your browser console</li>
                <li>It will automatically extract and copy the URL to your clipboard</li>
              </ol>
              
              <div className="mt-4 relative">
                <SyntaxHighlighter
                  language="javascript"
                  style={atomOneDark}
                  customStyle={{
                    padding: '1rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    maxHeight: '12rem',
                  }}
                >
                  {consoleExtractorCode}
                </SyntaxHighlighter>
                
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(consoleExtractorCode)
                      .then(() => {
                        toast({
                          title: "Script copied to clipboard",
                          description: "Now paste it in your browser console and run it",
                        });
                      })
                      .catch(err => {
                        console.error('Failed to copy: ', err);
                        toast({
                          title: "Failed to copy",
                          description: "Please try selecting and copying the code manually",
                          variant: "destructive",
                        });
                      });
                  }}
                  className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white flex items-center space-x-1 py-1 px-2 rounded text-xs"
                  size="sm"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  <span>Copy</span>
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="responseJson" className="font-medium text-gray-700">
                Paste JSON Response Here
              </Label>
              <Textarea
                id="responseJson"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="w-full min-h-[150px] px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                placeholder='Paste API response JSON here, like: {"success":true,"data":{"link":"https://example.com/video.mp4"}}'
              />
            </div>
            
            <Button 
              onClick={extractUrl}
              className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200"
            >
              Extract URL from JSON Response
            </Button>
          </TabsContent>
          
          <TabsContent value="console" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="consoleObject" className="font-medium text-gray-700">
                Paste Console Object Here
              </Label>
              <div className="bg-gray-100 rounded p-2 text-sm mb-2">
                <p className="flex items-center text-gray-600">
                  <Code className="h-4 w-4 mr-1" /> 
                  Copy the entire console output, including:
                </p>
                <pre className="mt-1 text-xs bg-gray-200 p-1 rounded overflow-x-auto">
Object {'{'}success: true, data: {'{'}...{'}'}{'}'}<br/>
data: Object<br/>
link: https://example.com/video.mp4
                </pre>
              </div>
              <Textarea
                id="consoleObject"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="w-full min-h-[150px] px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                placeholder="Object {success: true, data: {...}}
data: Object
link: https://example.com/video.mp4"
              />
            </div>
            
            <Button 
              onClick={handleConsoleObject}
              className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200"
            >
              Extract URL from Console Object
            </Button>
          </TabsContent>
        </Tabs>
        
        {extractedUrl && (
          <div className="mt-6 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-gray-700">Extracted URL:</Label>
              <Button
                onClick={copyUrlToClipboard}
                variant={isCopied ? "default" : "secondary"}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition duration-200 ${
                  isCopied ? 'bg-success text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                size="sm"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4" />
                    <span>Copy URL</span>
                  </>
                )}
              </Button>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 break-all">
              <Input 
                value={extractedUrl} 
                readOnly 
                className="font-mono text-sm bg-transparent border-none p-0 focus-visible:ring-0"
              />
            </div>
            
            <p className="text-sm text-gray-500 mt-2 flex items-center">
              <ArrowDownRight className="h-4 w-4 mr-1 text-primary" />
              This is the direct URL you can use in video players or for direct access
            </p>
          </div>
        )}
      </section>
    </Card>
  );
}