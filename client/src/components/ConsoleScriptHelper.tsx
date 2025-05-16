import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, Code } from "lucide-react";

export default function ConsoleScriptHelper() {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const consoleScript = `
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

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(consoleScript)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: "Script copied to clipboard",
          description: "Now paste and run it in your browser console",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Failed to copy",
          description: "Please try manually selecting and copying the code",
          variant: "destructive",
        });
      });
  };

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Console Script Helper</h2>
        
        <div className="bg-gray-100 rounded-lg p-4 text-sm mb-4">
          <h3 className="font-medium text-gray-800 mb-2 flex items-center">
            <Code className="h-4 w-4 mr-2" />
            Extract URL directly in your browser console
          </h3>
          
          <ol className="list-decimal pl-5 space-y-2 text-gray-700">
            <li>After running your API request in the browser console, you&apos;ll see a response object</li>
            <li>Copy the script below by clicking the &quot;Copy Script&quot; button</li>
            <li>Paste it in your browser console and press Enter</li>
            <li>It will automatically extract the URL from the response and copy it to your clipboard</li>
          </ol>
        </div>
        
        <pre className="bg-gray-800 text-gray-200 p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap mb-4">
          {consoleScript}
        </pre>
        
        <Button 
          onClick={copyScriptToClipboard}
          className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200 flex items-center justify-center"
        >
          {isCopied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              <span>Copied! Now paste in browser console</span>
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4 mr-2" />
              <span>Copy Script</span>
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}