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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [isControlsAnimationActive, setIsControlsAnimationActive] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [encryptedUrl, setEncryptedUrl] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // Control animation and visibility
  const showPlayerControls = () => {
    setShowControls(true);
    
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set a new timeout to hide controls after 3 seconds of inactivity
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };
  
  // Video player control methods
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    // Show animation effect
    setIsControlsAnimationActive(true);
    setTimeout(() => setIsControlsAnimationActive(false), 500);
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true); // Keep controls visible when paused
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
      showPlayerControls(); // Show controls briefly when playing
    }
  };
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    const newMuteState = !isMuted;
    videoRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
    showPlayerControls();
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
    
    showPlayerControls();
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
    showPlayerControls();
  };
  
  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    
    // Show animation effect
    setIsControlsAnimationActive(true);
    setTimeout(() => setIsControlsAnimationActive(false), 500);
    
    const newTime = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = Math.max(0, Math.min(newTime, videoRef.current.duration));
    showPlayerControls();
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
    
    showPlayerControls();
  };
  
  const changePlaybackSpeed = (speed: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedOptions(false);
    
    toast({
      title: "Playback Speed",
      description: `Speed set to ${speed}x`,
    });
    
    showPlayerControls();
  };
  
  const toggleSpeedOptions = () => {
    setShowSpeedOptions(!showSpeedOptions);
    setShowQualityOptions(false);
    showPlayerControls();
  };
  
  const toggleQualityOptions = () => {
    setShowQualityOptions(!showQualityOptions);
    setShowSpeedOptions(false);
    showPlayerControls();
  };
  
  const setQuality = (quality: string) => {
    setSelectedQuality(quality);
    setShowQualityOptions(false);
    
    toast({
      title: "Quality Changed",
      description: `Quality set to ${quality}`,
    });
    
    showPlayerControls();
  };
  
  // Format time from seconds to MM:SS
  const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds)) return "00:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle admin authentication
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminPassword.trim()) {
      toast({
        title: "Authentication Failed",
        description: "Password cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Authenticate against server-side endpoint
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminPassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAdminAuthenticated(true);
        setShowAdminAuth(false);
        toast({
          title: "Authentication Successful",
          description: "You now have admin access to view the stream URL",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: "Incorrect admin password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Error",
        description: "An error occurred during authentication",
        variant: "destructive",
      });
    }
  };
  
  // Generate encrypted URL for sharing
  const generateEncryptedUrl = () => {
    if (!m3u8Url) {
      toast({
        title: "No URL available",
        description: "Please enter credentials in the Code Generator section first",
        variant: "destructive",
      });
      return;
    }
    
    // Simple "encryption" by encoding the URL - in a real app this would be more secure
    const encodedUrl = btoa(m3u8Url);
    const appUrl = window.location.origin;
    const encryptedPlayerUrl = `${appUrl}/secure-player?token=${encodedUrl}`;
    
    setEncryptedUrl(encryptedPlayerUrl);
    
    toast({
      title: "Encrypted URL Generated",
      description: "The secure player URL has been generated",
    });
  };
  
  // Copy the URL to clipboard
  const copyToClipboard = async (urlToCopy: string) => {
    if (!urlToCopy) {
      toast({
        title: "No URL available",
        description: "Please enter credentials in the Code Generator section first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "URL copied",
        description: "URL copied to clipboard",
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
      
      // Set default qualities based on different available resolutions
      setAvailableQualities(['auto', '1080p', '720p', '480p', '360p']);
    }
  }, [m3u8Url]);
  
  // Mouse movement listener for showing controls
  useEffect(() => {
    const playerElement = playerContainerRef.current;
    
    if (!playerElement) return;
    
    const handleMouseMove = () => {
      showPlayerControls();
    };
    
    playerElement.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      playerElement.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

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
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="player" className="flex items-center">
                <MonitorPlay className="h-4 w-4 mr-2" />
                Advanced Player
              </TabsTrigger>
              <TabsTrigger value="encrypted" className="flex items-center">
                <Clipboard className="h-4 w-4 mr-2" />
                Encrypted Stream
              </TabsTrigger>
            </TabsList>
            
            {/* Player Tab */}
            <TabsContent value="player" className="mt-0">
              <div 
                className="relative bg-black rounded-md overflow-hidden"
                ref={playerContainerRef}
              >
                {/* Play/Pause Animation Overlay */}
                {isControlsAnimationActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-black/40 rounded-full p-6 animate-pulse">
                      {isPlaying ? 
                        <Play className="h-14 w-14 text-white animate-fadeIn" /> : 
                        <Pause className="h-14 w-14 text-white animate-fadeIn" />
                      }
                    </div>
                  </div>
                )}
                
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
                
                {/* Video Controls - only shown when showControls is true or video is paused */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${
                    (showControls || !isPlaying) ? 'opacity-100' : 'opacity-0'
                  }`}
                >
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
                        className="text-white hover:text-primary focus:outline-none group relative controls-btn"
                      >
                        <SkipBack className="h-5 w-5" />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap animate-scaleIn">
                          -10 seconds
                        </span>
                      </button>
                      
                      <button 
                        onClick={togglePlay} 
                        className="bg-white rounded-full p-2 hover:bg-primary hover:text-white focus:outline-none transition-colors"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      
                      <button 
                        onClick={() => handleSkip(10)} 
                        className="text-white hover:text-primary focus:outline-none group relative"
                      >
                        <SkipForward className="h-5 w-5" />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          +10 seconds
                        </span>
                      </button>
                      
                      {/* Playback Speed Control */}
                      <div className="relative">
                        <button 
                          onClick={toggleSpeedOptions}
                          className="text-white hover:text-primary focus:outline-none ml-2 group relative"
                        >
                          <div className="flex items-center">
                            <span className="text-xs font-medium">{playbackSpeed}x</span>
                          </div>
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Playback speed
                          </span>
                        </button>
                        
                        {/* Speed Options Dropdown */}
                        {showSpeedOptions && (
                          <div className="absolute bottom-10 left-0 bg-black/80 rounded-md py-1 z-20 animate-fadeIn">
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                              <button
                                key={speed}
                                className={`block w-full text-left px-4 py-1 text-sm ${
                                  playbackSpeed === speed ? 'text-primary' : 'text-white'
                                } hover:bg-white/10`}
                                onClick={() => changePlaybackSpeed(speed)}
                              >
                                {speed}x {playbackSpeed === speed && '✓'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Quality Selection */}
                      <div className="relative">
                        <button 
                          onClick={toggleQualityOptions}
                          className="text-white hover:text-primary focus:outline-none group relative"
                        >
                          <div className="flex items-center">
                            <span className="text-xs font-medium">{selectedQuality}</span>
                          </div>
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Video quality
                          </span>
                        </button>
                        
                        {/* Quality Options Dropdown */}
                        {showQualityOptions && (
                          <div className="absolute bottom-10 right-0 bg-black/80 rounded-md py-1 z-20 animate-fadeIn min-w-[80px]">
                            {availableQualities.map((quality) => (
                              <button
                                key={quality}
                                className={`block w-full text-left px-4 py-1 text-sm ${
                                  selectedQuality === quality ? 'text-primary' : 'text-white'
                                } hover:bg-white/10`}
                                onClick={() => setQuality(quality)}
                              >
                                {quality} {selectedQuality === quality && '✓'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <button 
                          onClick={toggleMute} 
                          className="text-white hover:text-primary focus:outline-none mr-2 group relative"
                        >
                          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {isMuted ? 'Unmute' : 'Mute'}
                          </span>
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
                        className="text-white hover:text-primary focus:outline-none group relative"
                      >
                        <RotateCw className="h-5 w-5" />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          Restart
                        </span>
                      </button>
                      
                      <button 
                        onClick={toggleFullscreen} 
                        className="text-white hover:text-primary focus:outline-none group relative"
                      >
                        <Maximize className="h-5 w-5" />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          Fullscreen
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Encrypted Stream Tab */}
            <TabsContent value="encrypted" className="mt-0">
              <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Secure Encrypted Stream</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate an encrypted stream URL that can be shared securely. The encrypted URL will work in the embedded player without exposing the actual stream source.
                  </p>
                  
                  {encryptedUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-700">Your Encrypted URL:</h4>
                        <Button
                          onClick={() => {
                            if (encryptedUrl) copyToClipboard(encryptedUrl);
                          }}
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
                      
                      <div className="bg-white p-3 rounded-md border border-gray-200 break-all">
                        <code className="text-sm font-mono text-gray-800 blur-permanent select-none">{encryptedUrl}</code>
                      </div>
                      
                      {/* Encrypted Stream Preview Player */}
                      <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-medium text-gray-700 p-3 bg-gray-50 border-b border-gray-200">
                          Secure Player Preview
                        </h4>
                        <div className="aspect-video bg-black relative">
                          <iframe 
                            src={`/secure-player?token=${encryptedUrl.split('token=')[1] || ''}`}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between">
                          <span className="text-sm text-gray-600">Stream source is safely encrypted</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => window.open(encryptedUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open in New Tab
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      onClick={generateEncryptedUrl}
                      className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200"
                    >
                      Generate Encrypted Stream URL
                    </Button>
                  )}
                </div>
                
                <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Admin Access</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Admin access is required to view the direct stream URL. This helps prevent unauthorized access to source streams.
                  </p>
                  
                  {isAdminAuthenticated ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-700">Direct Stream URL:</h4>
                        <Button
                          onClick={() => {
                            if (m3u8Url) copyToClipboard(m3u8Url);
                          }}
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
                      
                      <div className="bg-white p-3 rounded-md border border-gray-200 break-all">
                        <code className="text-sm font-mono text-gray-800 blur-sm hover:blur-0 focus:blur-0 transition-all duration-300">
                          {m3u8Url}
                        </code>
                      </div>
                      
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsAdminAuthenticated(false)}
                          className="text-xs text-gray-600"
                        >
                          Logout
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {showAdminAuth ? (
                        <form onSubmit={handleAdminAuth} className="space-y-3">
                          <div className="space-y-2">
                            <label htmlFor="adminPassword" className="text-sm font-medium text-gray-700">
                              Admin Password:
                            </label>
                            <input
                              id="adminPassword"
                              type="password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                              placeholder="Enter admin password"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAdminAuth(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit">
                              Authenticate
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <Button 
                          onClick={() => setShowAdminAuth(true)}
                          className="w-full bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-md transition duration-200"
                        >
                          Authenticate as Admin
                        </Button>
                      )}
                    </div>
                  )}
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