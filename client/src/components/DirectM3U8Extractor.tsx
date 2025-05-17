import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Play, Clipboard, Check, Settings, Maximize, Pause, VolumeX, Volume2, SkipForward, SkipBack, RotateCw, MonitorPlay, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

export default function DirectM3U8Extractor() {
  const [m3u8Url, setM3U8Url] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("player");
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
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
      
      // Only auto-extract if both fields have non-empty values
      if (fileIdInput && apiKeyInput && 
          fileIdInput.value && fileIdInput.value.trim() !== '' &&
          apiKeyInput.value && apiKeyInput.value.trim() !== '') {
        fetchM3U8WithCredentials(fileIdInput.value, apiKeyInput.value);
      } else if (m3u8Url) {
        // Clear any previous URL if credentials are now empty
        setM3U8Url("");
      }
    };

    // Check initially - but don't auto-extract on first load
    // We'll let the user enter values first

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
  }, [extractionUrl, m3u8Url]); // Re-run effect when the extractionUrl changes

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
        
        // Removed automatic clipboard copy here
        
        toast({
          title: "Direct URL ready",
          description: "Stream URL extracted successfully",
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

  // Video player control methods
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => {
        console.error("Failed to play video:", err);
        toast({
          title: "Playback Error",
          description: "Could not play the video. Check the URL or try another player.",
          variant: "destructive",
        });
      });
      setIsPlaying(true);
    }
  };
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    const newMuteState = !isMuted;
    videoRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    
    const newVolume = value[0];
    videoRef.current.volume = newVolume / 100;
    setVolume(newVolume);
    
    // If volume is set to 0, mute the video, otherwise unmute if it was muted
    if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };
  
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration);
  };
  
  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    
    const newTime = value[0];
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    
    const newTime = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = Math.max(0, Math.min(newTime, videoRef.current.duration));
  };
  
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Format time from seconds to MM:SS
  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds)) return "00:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset video player state when URL changes
  useEffect(() => {
    if (videoRef.current) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      videoRef.current.load();
    }
  }, [m3u8Url]);

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Advanced M3U8 Player</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-3 text-gray-600">Getting stream URL...</span>
          </div>
        ) : m3u8Url ? (
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="player" className="flex items-center">
                <MonitorPlay className="h-4 w-4 mr-2" />
                Player
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center">
                <Clipboard className="h-4 w-4 mr-2" />
                Stream URL
              </TabsTrigger>
              <TabsTrigger value="external" className="flex items-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                External Players
              </TabsTrigger>
            </TabsList>
            
            {/* Player Tab */}
            <TabsContent value="player" className="mt-0">
              <div 
                className="relative bg-black rounded-md overflow-hidden"
                ref={playerContainerRef}
              >
                <video
                  ref={videoRef}
                  className="w-full aspect-video bg-black"
                  src={m3u8Url}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onVolumeChange={() => setIsMuted(videoRef.current?.muted || false)}
                  onClick={togglePlay}
                  playsInline
                />
                
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <Slider
                      value={[currentTime]}
                      min={0}
                      max={duration || 100}
                      step={0.01}
                      onValueChange={handleSeek}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-white text-xs mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleSkip(-10)} 
                        className="text-white hover:text-primary focus:outline-none"
                      >
                        <SkipBack className="h-5 w-5" />
                      </button>
                      
                      <button 
                        onClick={togglePlay} 
                        className="bg-white rounded-full p-2 hover:bg-primary hover:text-white focus:outline-none transition-colors"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      
                      <button 
                        onClick={() => handleSkip(10)} 
                        className="text-white hover:text-primary focus:outline-none"
                      >
                        <SkipForward className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <button 
                          onClick={toggleMute} 
                          className="text-white hover:text-primary focus:outline-none mr-2"
                        >
                          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                        </button>
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={handleVolumeChange}
                          className="w-20"
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            videoRef.current.play();
                          }
                        }} 
                        className="text-white hover:text-primary focus:outline-none"
                      >
                        <RotateCw className="h-5 w-5" />
                      </button>
                      
                      <button 
                        onClick={toggleFullscreen} 
                        className="text-white hover:text-primary focus:outline-none"
                      >
                        <Maximize className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* URL Tab */}
            <TabsContent value="url" className="mt-0">
              <div className="space-y-4">
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
                        <span>Copy URL</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 break-all mb-2">
                  <code className="text-sm font-mono text-gray-800">{m3u8Url}</code>
                </div>
              </div>
            </TabsContent>
            
            {/* External Players Tab */}
            <TabsContent value="external" className="mt-0">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-2">Open in External Players</h3>
                  <p className="text-sm text-gray-600 mb-4">Use these links to open the stream in your preferred player:</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a 
                      href={`vlc://${m3u8Url}`}
                      className="flex items-center p-3 bg-white rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <img src="https://www.videolan.org/images/vlc-logo.png" alt="VLC" className="w-6 h-6 mr-2" />
                      <span className="font-medium">Open in VLC</span>
                    </a>
                    
                    <a 
                      href={`potplayer://${m3u8Url}`}
                      className="flex items-center p-3 bg-white rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <img src="https://potplayer.daum.net/images/PotPlayer64.png" alt="PotPlayer" className="w-6 h-6 mr-2" />
                      <span className="font-medium">Open in PotPlayer</span>
                    </a>
                    
                    <a 
                      href={m3u8Url}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="flex items-center p-3 bg-white rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <Play className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Open in New Tab</span>
                    </a>
                    
                    <a 
                      href={`https://www.hlsplayer.net/play?url=${encodeURIComponent(m3u8Url)}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="flex items-center p-3 bg-white rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink className="h-5 w-5 mr-2 text-primary" />
                      <span className="font-medium">Open in HLS Player</span>
                    </a>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  <p>Note: Protocol handlers (vlc://, potplayer://) work only if the apps are installed and configured on your system.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
            <MonitorPlay className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium">Enter credentials in the Code Generator</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              The stream URL will be automatically extracted and you'll be able to play it directly in this advanced player
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}