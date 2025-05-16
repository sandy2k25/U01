import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, ArrowDownRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ResponseUrlExtractor() {
  const [responseText, setResponseText] = useState("");
  const [extractedUrl, setExtractedUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  // Extract URL from response JSON
  const extractUrl = () => {
    try {
      // Parse the response text
      const responseObject = JSON.parse(responseText);
      
      // Check if it has the expected structure
      if (responseObject?.success && responseObject?.data?.link) {
        const url = responseObject.data.link;
        setExtractedUrl(url);
        toast({
          title: "URL extracted successfully",
          description: "URL has been extracted from the response",
        });
      } else {
        // Handle case where properties don't exist
        toast({
          title: "URL not found",
          description: "The response doesn't contain a URL in the expected format (data.link)",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON from the API response",
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
        
        <div className="space-y-4">
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
            Extract URL from Response
          </Button>
          
          {extractedUrl && (
            <div className="mt-4 space-y-2">
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
        </div>
      </section>
    </Card>
  );
}