import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, Loader2, Play, Search } from "lucide-react";

export default function M3U8Clipboard() {
  const [consoleInput, setConsoleInput] = useState("");
  const [m3u8Url, setM3U8Url] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  // Extract M3U8 URL from console output
  const extractM3U8Url = () => {
    if (!consoleInput.trim()) {
      toast({
        title: "No console output",
        description: "Please paste the console output first",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      // Look for specific patterns in the console output
      const linkMatches = consoleInput.match(/link:\s*["']?([^"'\s\n]+)["']?/);
      if (linkMatches && linkMatches[1]) {
        const extractedUrl = linkMatches[1];
        setM3U8Url(extractedUrl);
        toast({
          title: "URL extracted",
          description: "M3U8 URL has been successfully extracted",
        });
        return;
      }

      // Try to find any URL with .m3u8 extension
      const m3u8Matches = consoleInput.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
      if (m3u8Matches && m3u8Matches[1]) {
        const extractedUrl = m3u8Matches[1];
        setM3U8Url(extractedUrl);
        toast({
          title: "URL extracted",
          description: "M3U8 URL has been successfully extracted",
        });
        return;
      }

      toast({
        title: "URL not found",
        description: "Couldn't find an M3U8 URL in the console output",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error extracting URL:", error);
      toast({
        title: "Extraction failed",
        description: "An error occurred while extracting the URL",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    if (!m3u8Url.trim()) {
      toast({
        title: "No URL to copy",
        description: "Please extract an M3U8 URL first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    navigator.clipboard.writeText(m3u8Url)
      .then(() => {
        setIsCopied(true);
        toast({
          title: "URL copied to clipboard",
          description: "The M3U8 URL has been copied to your clipboard",
        });
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Failed to copy",
          description: "Please try again or copy manually",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  // Auto-extract when console input changes
  useEffect(() => {
    if (consoleInput.trim() && consoleInput.includes('link:')) {
      extractM3U8Url();
    }
  }, [consoleInput]);

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <section className="p-6">
        <h2 className="text-xl font-semibold mb-4">M3U8 URL Extractor & Copier</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="consoleOutput" className="font-medium text-gray-700">
              Paste Console Output
            </Label>
            <Textarea
              id="consoleOutput"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              className="w-full min-h-[100px] px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
              placeholder="Paste your console output here (Object {success: true, data: {...}} data: Object link: 'https://...m3u8')"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={extractM3U8Url}
              className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
              disabled={isExtracting || !consoleInput.trim()}
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  <span>Extract URL</span>
                </>
              )}
            </Button>
            
            <Button 
              onClick={copyToClipboard}
              className="flex-1 bg-primary hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center justify-center"
              disabled={isLoading || !m3u8Url.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Copying...</span>
                </>
              ) : isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4 mr-2" />
                  <span>Copy URL</span>
                </>
              )}
            </Button>
          </div>
          
          {m3u8Url && (
            <div className="mt-4">
              <Label className="font-medium text-gray-700 block mb-2">
                Extracted M3U8 URL:
              </Label>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200 break-all">
                <code className="text-sm font-mono text-gray-800">{m3u8Url}</code>
              </div>
              
              <div className="mt-3 flex justify-end">
                <a 
                  href={m3u8Url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:text-blue-700 font-medium"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Test Stream URL
                </a>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-md text-sm border border-gray-200 mt-2">
            <p className="text-gray-600">
              This tool automatically extracts M3U8 streaming URLs from console output. Just paste the console output above, and the tool will find and extract the URL for you. Click "Copy URL" to copy it to your clipboard.
            </p>
          </div>
        </div>
      </section>
    </Card>
  );
}