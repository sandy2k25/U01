import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Info, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MediaInfo {
  title: string;
  file: string;
  key: string;
}

export default function MediaInfoSearch() {
  const [mediaId, setMediaId] = useState("");
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Search for media info
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mediaId.trim()) {
      setError("Please enter a valid media ID");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      const response = await fetch(`https://oplij.koyeb.app/api/v1/mediaInfo?id=${mediaId.trim()}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setMediaInfo(data);
      
      // Transfer data to code generator fields
      const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
      const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
      
      if (fileIdInput && apiKeyInput && data.file && data.key) {
        fileIdInput.value = data.file;
        apiKeyInput.value = data.key;
        
        // Trigger change events
        const event = new Event('input', { bubbles: true });
        fileIdInput.dispatchEvent(event);
        apiKeyInput.dispatchEvent(event);
        
        toast({
          title: "Information transferred",
          description: "File ID and API Key have been transferred to the form below",
        });
      }
    } catch (err) {
      console.error("Failed to fetch media info:", err);
      setError("Failed to retrieve media information. Please check the ID and try again.");
      setMediaInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Search Section */}
      <section className="p-6">
        <div className="flex items-center mb-4">
          <Info className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-xl font-semibold">Media Information Search</h2>
        </div>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mediaId" className="font-medium text-gray-700">Media ID</Label>
            <div className="flex space-x-2">
              <Input
                id="mediaId"
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="e.g. tt1877830"
              />
              <Button 
                type="submit"
                className="bg-primary hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
            {error && (
              <p className="text-error text-sm">{error}</p>
            )}
          </div>
        </form>
        
        {/* Results Section */}
        {mediaInfo && (
          <div className="mt-6">
            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-2">Media Information</h3>
            <div className="bg-gray-50 p-4 rounded-md space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <span className="text-gray-600 font-medium">Title:</span>
                <span className="col-span-3 font-semibold text-primary">{mediaInfo.title}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="text-gray-600 font-medium">File ID:</span>
                <span className="col-span-3 text-sm font-mono bg-gray-100 p-1 rounded">{mediaInfo.file}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span className="text-gray-600 font-medium">API Key:</span>
                <span className="col-span-3 text-sm font-mono bg-gray-100 p-1 rounded">{mediaInfo.key}</span>
              </div>
              
              <div className="mt-4 flex justify-end">
                <span className="text-sm text-gray-500 flex items-center">
                  Values automatically transferred to the code generator below
                  <ArrowRight className="h-4 w-4 ml-1" />
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </Card>
  );
}