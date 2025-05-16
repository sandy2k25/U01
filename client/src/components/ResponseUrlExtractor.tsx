import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, ArrowDownRight, Code } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      // Try to extract using regex pattern matching
      const linkMatch = responseText.match(/link['":\s]+([^'"}\s]+)/);
      if (linkMatch && linkMatch[1]) {
        setExtractedUrl(linkMatch[1]);
        toast({
          title: "URL extracted from console object",
          description: "Found URL in the console representation",
        });
        return;
      }
      
      // If direct pattern matching failed, try to find any URL-like patterns
      const urlRegex = /(https?:\/\/[^\s'"]+)/g;
      const matches = responseText.match(urlRegex);
      
      if (matches && matches.length > 0) {
        setExtractedUrl(matches[0]);
        toast({
          title: "URL extracted from text",
          description: "Found a URL pattern in the console output",
        });
        return;
      }
      
      toast({
        title: "URL not found",
        description: "Couldn't extract URL from the console object format",
        variant: "destructive",
      });
      
    } catch (err) {
      console.error("Error parsing console object:", err);
      toast({
        title: "Parsing failed",
        description: "Could not parse the console object format",
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

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <section className="p-6">
        <h2 className="text-xl font-semibold mb-4">URL Extractor</h2>
        
        <Tabs defaultValue="paste" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="paste">JSON Response</TabsTrigger>
            <TabsTrigger value="console">Console Object</TabsTrigger>
          </TabsList>
          
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
                  Copy the entire console output, including console browser objects
                </p>
              </div>
              <Textarea
                id="consoleObject"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="w-full min-h-[150px] px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                placeholder="Object success: true, data: {link: 'https://example.com/video.mp4'}"
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