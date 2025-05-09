import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Info, ArrowRight, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PlaylistItem {
  title: string;
  id: string;
  translator: string;
  targets: string;
  file: string;
}

interface MediaInfoResponse {
  success: boolean;
  data: {
    playlist: Array<PlaylistItem | any>;
    key: string;
  };
}

interface MediaInfoData {
  title: string;
  file: string;
  key: string;
}

export default function MediaInfoSearch() {
  const [mediaId, setMediaId] = useState("");
  const [mediaInfo, setMediaInfo] = useState<MediaInfoData | null>(null);
  const [allLanguages, setAllLanguages] = useState<PlaylistItem[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  // Handle language selection change
  const handleLanguageSelect = (id: string) => {
    setSelectedLanguageId(id);
    
    // Find the selected language in allLanguages
    const selectedLanguage = allLanguages.find(lang => lang.id === id);
    
    if (selectedLanguage && apiKey) {
      // Update mediaInfo
      const mediaData: MediaInfoData = {
        title: selectedLanguage.title,
        file: selectedLanguage.file,
        key: apiKey
      };
      
      setMediaInfo(mediaData);
      
      // Transfer data to code generator fields
      const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
      const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
      
      if (fileIdInput && apiKeyInput) {
        fileIdInput.value = selectedLanguage.file;
        apiKeyInput.value = apiKey;
        
        // Trigger change events
        const event = new Event('input', { bubbles: true });
        fileIdInput.dispatchEvent(event);
        apiKeyInput.dispatchEvent(event);
        
        toast({
          title: "Language selected",
          description: `${selectedLanguage.title} file ID has been transferred to the form below`,
        });
      }
    }
  };

  // Search for media info
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mediaId.trim()) {
      setError("Please enter a valid media ID");
      return;
    }
    
    setError("");
    setIsLoading(true);
    setAllLanguages([]);
    setMediaInfo(null);
    
    try {
      const response = await fetch(`https://oplij.koyeb.app/api/v1/mediaInfo?id=${mediaId.trim()}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Parse response data
      const responseData: MediaInfoResponse = await response.json();
      
      if (!responseData.success) {
        throw new Error("API returned unsuccessful response");
      }
      
      // Extract playlist items and key
      const playlist = responseData.data.playlist;
      const key = responseData.data.key;
      setApiKey(key);
      
      // Get valid playlist items (skip first empty array item if present)
      const languages: PlaylistItem[] = [];
      for (const item of playlist) {
        if (item && typeof item === 'object' && item.title && item.file) {
          languages.push(item as PlaylistItem);
        }
      }
      
      if (languages.length > 0) {
        // Set all languages
        setAllLanguages(languages);
        
        // Set first language as default selected
        const firstLanguage = languages[0];
        setSelectedLanguageId(firstLanguage.id);
        
        // Set initial media info with first language
        const mediaData: MediaInfoData = {
          title: firstLanguage.title,
          file: firstLanguage.file,
          key: key
        };
        
        setMediaInfo(mediaData);
        
        // Transfer data to code generator fields
        const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
        const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
        
        if (fileIdInput && apiKeyInput) {
          fileIdInput.value = firstLanguage.file;
          apiKeyInput.value = key;
          
          // Trigger change events
          const event = new Event('input', { bubbles: true });
          fileIdInput.dispatchEvent(event);
          apiKeyInput.dispatchEvent(event);
          
          toast({
            title: "Media found",
            description: "Select your preferred language below. Values automatically transferred to code generator.",
          });
        }
      } else {
        throw new Error("No valid media information found in the response");
      }
    } catch (err) {
      console.error("Failed to fetch media info:", err);
      setError("Failed to retrieve media information. Please check the ID and try again.");
      setMediaInfo(null);
      setAllLanguages([]);
      setSelectedLanguageId("");
      setApiKey("");
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
        {allLanguages.length > 0 && apiKey && (
          <div className="mt-6">
            <Separator className="my-4" />
            <h3 className="text-lg font-semibold mb-2">Available Languages</h3>
            
            <div className="bg-gray-50 p-4 rounded-md space-y-4">
              <RadioGroup 
                value={selectedLanguageId} 
                onValueChange={handleLanguageSelect}
                className="space-y-2"
              >
                {allLanguages.map(language => (
                  <div key={language.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100">
                    <RadioGroupItem value={language.id} id={language.id} />
                    <Label 
                      htmlFor={language.id} 
                      className={`flex flex-1 cursor-pointer ${selectedLanguageId === language.id ? 'font-semibold text-primary' : 'text-gray-700'}`}
                    >
                      {language.title}
                      {selectedLanguageId === language.id && (
                        <Check className="h-4 w-4 ml-2 text-primary" />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {mediaInfo && (
                <div className="pt-3 border-t border-gray-200 mt-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-600 font-medium">Selected:</span>
                    <span className="col-span-3 font-semibold text-primary">{mediaInfo.title}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-600 font-medium">File ID:</span>
                    <span className="col-span-3 text-sm font-mono bg-gray-100 p-1 rounded truncate">{mediaInfo.file}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-600 font-medium">API Key:</span>
                    <span className="col-span-3 text-sm font-mono bg-gray-100 p-1 rounded truncate">{mediaInfo.key}</span>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <span className="text-sm text-gray-500 flex items-center">
                      Values automatically transferred to the code generator below
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </Card>
  );
}