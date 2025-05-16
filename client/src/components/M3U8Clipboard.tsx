import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, Loader2 } from "lucide-react";

export default function M3U8Clipboard() {
  const [m3u8Url, setM3U8Url] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    if (!m3u8Url.trim()) {
      toast({
        title: "No URL to copy",
        description: "Please enter a M3U8 URL first",
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

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <section className="p-6">
        <h2 className="text-xl font-semibold mb-4">One-Click M3U8 URL Copy</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m3u8Url" className="font-medium text-gray-700">
              M3U8 URL
            </Label>
            <Input
              id="m3u8Url"
              value={m3u8Url}
              onChange={(e) => setM3U8Url(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
              placeholder="Paste your M3U8 URL here"
            />
          </div>
          
          <Button 
            onClick={copyToClipboard}
            className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200 flex items-center justify-center"
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
                <span>Copy to Clipboard</span>
              </>
            )}
          </Button>
          
          <div className="bg-gray-50 p-4 rounded-md text-sm border border-gray-200 mt-4">
            <p className="text-gray-600">
              This tool allows you to easily copy M3U8 streaming URLs to your clipboard with one click. Paste the URL from your console output above, then click the copy button.
            </p>
          </div>
        </div>
      </section>
    </Card>
  );
}