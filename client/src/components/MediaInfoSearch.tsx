import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Info, ArrowRight, Check, RefreshCw, Film } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface TmdbSearchResult {
  success: boolean;
  imdbId: string;
  title: string;
  release_date: string;
}

interface MovieSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string;
  overview?: string;
}

export default function MediaInfoSearch() {
  const [mediaId, setMediaId] = useState("");
  const [mediaInfo, setMediaInfo] = useState<MediaInfoData | null>(null);
  const [allLanguages, setAllLanguages] = useState<PlaylistItem[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // ID type selector
  const [idType, setIdType] = useState<"imdb" | "tmdb">("imdb");
  
  // TMDB ID search states
  const [tmdbId, setTmdbId] = useState("");
  const [tmdbSearchResult, setTmdbSearchResult] = useState<TmdbSearchResult | null>(null);
  const [isTmdbLoading, setIsTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState("");
  
  // Movie title search states
  const [movieSearchQuery, setMovieSearchQuery] = useState("");
  const [movieSearchResults, setMovieSearchResults] = useState<MovieSearchResult[]>([]);
  const [isMovieSearchLoading, setIsMovieSearchLoading] = useState(false);
  const [movieSearchError, setMovieSearchError] = useState("");
  
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
        // Create a more specific custom event with the actual data
        const languageSelectedEvent = new CustomEvent('language-selected', {
          bubbles: true,
          detail: {
            fileId: selectedLanguage.file,
            apiKey: apiKey
          }
        });
        
        // Dispatch the custom event with the data
        document.dispatchEvent(languageSelectedEvent);
          
        toast({
          title: "Language selected",
          description: `${selectedLanguage.title} file ID has been transferred and code updated`,
        });
      }
    }
  };

  // Search for media info with IMDB or TMDB ID
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
    
    // If user selected TMDB ID, convert it to IMDB first
    let finalId = mediaId.trim();
    if (idType === "tmdb") {
      try {
        setIsTmdbLoading(true);
        const response = await fetch(`/api/tmdb-to-imdb/${mediaId.trim()}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || "Failed to convert TMDB ID");
        }
        
        setTmdbSearchResult(data);
        finalId = data.imdbId; // Use the converted IMDB ID
        
        toast({
          title: "TMDB ID Converted",
          description: `Found "${data.title}" (${data.release_date?.substring(0, 4) || ''}). Using IMDB ID: ${data.imdbId}`,
        });
      } catch (err) {
        console.error("Failed to convert TMDB ID:", err);
        setTmdbError("Failed to convert TMDB ID. Please check the ID and try again.");
        setIsLoading(false);
        setIsTmdbLoading(false);
        return;
      } finally {
        setIsTmdbLoading(false);
      }
    } else {
      // Clear any previous TMDB conversion results
      setTmdbSearchResult(null);
    }
    
    try {
      // Using the API format that's working correctly
      const response = await fetch(`https://oplij.koyeb.app/api/v1/mediaInfo?id=${finalId}`);
      
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

  // Auto-search after typing 2 or more letters
  useEffect(() => {
    // Don't search if query is less than 2 characters
    if (movieSearchQuery.trim().length < 2) {
      setMovieSearchResults([]);
      return;
    }
    
    // Debounce function to avoid too many requests
    const debounceTimer = setTimeout(async () => {
      setMovieSearchError("");
      setIsMovieSearchLoading(true);
      
      try {
        // Use server-side endpoint to avoid exposing API key in client
        const response = await fetch(`/api/search-files?query=${encodeURIComponent(movieSearchQuery.trim())}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.results && data.results.length > 0) {
          setMovieSearchResults(data.results);
        } else {
          // Only show error if query is meaningful
          if (movieSearchQuery.trim().length > 3) {
            setMovieSearchError("No files found matching your search.");
          }
          setMovieSearchResults([]);
        }
      } catch (err) {
        console.error("Failed to search for files:", err);
        setMovieSearchError("Failed to search for files. Please try again.");
      } finally {
        setIsMovieSearchLoading(false);
      }
    }, 300); // 300ms delay to avoid excessive API calls
    
    // Clean up the timeout if the component unmounts or if the query changes
    return () => clearTimeout(debounceTimer);
  }, [movieSearchQuery]);
  
  // Handle form submission
  const handleMovieSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!movieSearchQuery.trim()) {
      setMovieSearchError("Please enter a file title to search");
      return;
    }
    
    // The actual search is now handled by the useEffect hook
  };
  
  // Handle selecting a movie from the search results
  const handleMovieSelect = async (tmdbId: number) => {
    setTmdbId(tmdbId.toString());
    
    try {
      setIsTmdbLoading(true);
      setTmdbError("");
      setTmdbSearchResult(null);
      
      const response = await fetch(`/api/tmdb-to-imdb/${tmdbId}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to convert TMDB ID");
      }
      
      setTmdbSearchResult(data);
      
      // Auto-fill the media ID input with the IMDB ID
      setMediaId(data.imdbId);
      
      toast({
        title: "TMDB ID Converted",
        description: `Found "${data.title}" (${data.release_date?.substring(0, 4) || ''}). IMDB ID: ${data.imdbId}`,
      });
      
      // Automatically trigger the media info search
      const mediaIdForm = document.getElementById("mediaIdForm") as HTMLFormElement;
      if (mediaIdForm) {
        mediaIdForm.requestSubmit();
      }
      
    } catch (err) {
      console.error("Failed to convert TMDB ID:", err);
      setTmdbError("Failed to convert TMDB ID. Please try again.");
      setTmdbSearchResult(null);
    } finally {
      setIsTmdbLoading(false);
    }
  };

  // Handle TMDB ID search
  const handleTmdbSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tmdbId.trim()) {
      setTmdbError("Please enter a valid TMDB ID");
      return;
    }
    
    setTmdbError("");
    setIsTmdbLoading(true);
    setTmdbSearchResult(null);
    
    try {
      const response = await fetch(`/api/tmdb-to-imdb/${tmdbId.trim()}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to convert TMDB ID");
      }
      
      setTmdbSearchResult(data);
      
      // Auto-fill the media ID input with the IMDB ID
      setMediaId(data.imdbId);
      
      toast({
        title: "TMDB ID Converted",
        description: `Found "${data.title}" (${data.release_date.substring(0, 4)}). IMDB ID: ${data.imdbId}`,
      });
      
      // Automatically trigger the media info search
      const mediaIdForm = document.getElementById("mediaIdForm") as HTMLFormElement;
      if (mediaIdForm) {
        mediaIdForm.requestSubmit();
      }
      
    } catch (err) {
      console.error("Failed to convert TMDB ID:", err);
      setTmdbError("Failed to convert TMDB ID. Please check the ID and try again.");
      setTmdbSearchResult(null);
    } finally {
      setIsTmdbLoading(false);
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
        
        <div className="space-y-8">
          {/* Movie Title Search */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <Film className="h-4 w-4 mr-2" /> 
              Search for Files
            </h3>
            <form onSubmit={handleMovieSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="movieSearchQuery" className="font-medium text-gray-700">File Title</Label>
                <div className="flex space-x-2">
                  <Input
                    id="movieSearchQuery"
                    value={movieSearchQuery}
                    onChange={(e) => setMovieSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g. The Dark Knight"
                  />
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center"
                    disabled={isMovieSearchLoading}
                  >
                    {isMovieSearchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>
                {movieSearchError && (
                  <p className="text-error text-sm">{movieSearchError}</p>
                )}
                
                {/* File Search Results */}
                {movieSearchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Found {movieSearchResults.length} files:</p>
                    <div className="max-h-72 overflow-y-auto pr-2">
                      {movieSearchResults.map((movie) => (
                        <div 
                          key={movie.id} 
                          className="p-3 bg-gray-50 rounded-md border border-gray-200 mb-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleMovieSelect(movie.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{movie.title}</p>
                              {movie.release_date && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Release: {movie.release_date.substring(0, 4)}
                                </p>
                              )}
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMovieSelect(movie.id);
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
          
          {/* Combined ID Search with Dropdown */}
          <div>
            <Separator className="my-4" />
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <Search className="h-4 w-4 mr-2" /> 
              Search by ID
            </h3>
            <form id="mediaIdForm" onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor="idType" className="font-medium text-gray-700 whitespace-nowrap">ID Type</Label>
                  <Select value={idType} onValueChange={(value) => setIdType(value as "imdb" | "tmdb")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select ID Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="imdb">IMDB ID</SelectItem>
                      <SelectItem value="tmdb">TMDB ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    id="mediaId"
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary blur-sm hover:blur-[2px] focus:blur-0"
                    placeholder={idType === "imdb" ? "e.g. tt1877830" : "e.g. 299536"}
                  />
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-200 flex items-center"
                    disabled={isLoading || isTmdbLoading}
                  >
                    {isLoading || isTmdbLoading ? (
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
                {tmdbError && (
                  <p className="text-error text-sm">{tmdbError}</p>
                )}
                
                {tmdbSearchResult && idType === "tmdb" && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Found: <span className="text-primary">{tmdbSearchResult.title}</span> ({tmdbSearchResult.release_date?.substring(0, 4) || ''})</p>
                    <p className="text-xs text-gray-500 mt-1">Converted to IMDB ID: <span className="font-mono">{tmdbSearchResult.imdbId}</span></p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
        
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
                    <span className="col-span-3 text-sm font-mono bg-gray-100 p-1 rounded truncate blur-sm hover:blur-[2px] focus:blur-0">{mediaInfo.file}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <span className="text-gray-600 font-medium">API Key:</span>
                    <span className="col-span-3 text-sm font-mono bg-gray-100 p-1 rounded truncate blur-sm hover:blur-[2px] focus:blur-0">{mediaInfo.key}</span>
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