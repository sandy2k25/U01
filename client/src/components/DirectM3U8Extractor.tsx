import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Play, Clipboard, Check, Settings, Maximize, Pause, VolumeX, Volume2, SkipForward, SkipBack, RotateCw, MonitorPlay, ExternalLink, PlayCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import Hls from "hls.js";

// Extend HTMLVideoElement to include the HLS instance property
interface HTMLVideoElementWithHls extends HTMLVideoElement {
  hlsInstance?: Hls;
}

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
  
  const videoRef = useRef<HTMLVideoElementWithHls>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);
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
    console.log("Setting up credential monitors");
    
    const checkForCredentials = () => {
      const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
      const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
      
      console.log("Checking for credentials:", 
                  fileIdInput?.value ? "fileId present" : "no fileId", 
                  apiKeyInput?.value ? "apiKey present" : "no apiKey");
      
      // Only auto-extract if both fields have non-empty values
      if (fileIdInput && apiKeyInput && 
          fileIdInput.value && fileIdInput.value.trim() !== '' &&
          apiKeyInput.value && apiKeyInput.value.trim() !== '') {
        console.log("Both credentials present, fetching M3U8 URL");
        fetchM3U8WithCredentials(fileIdInput.value, apiKeyInput.value);
      } else if (m3u8Url) {
        // Clear any previous URL if credentials are now empty
        console.log("Credentials not found, clearing any existing M3U8 URL");
        setM3U8Url("");
      }
    };

    // Run an initial check to auto-load if credentials are already present
    setTimeout(checkForCredentials, 1000);

    // Setup listeners to detect changes in the Code Generator fields
    const setupChangeListeners = () => {
      const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
      const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
      
      if (fileIdInput && apiKeyInput) {
        console.log("Found input fields, setting up change listeners");
        
        const handleFileIdChange = () => {
          console.log("fileId changed to:", fileIdInput.value);
          checkForCredentials();
        };
        
        const handleApiKeyChange = () => {
          console.log("apiKey changed to:", apiKeyInput.value ? "value present" : "empty");
          checkForCredentials();
        };
        
        fileIdInput.addEventListener('input', handleFileIdChange);
        apiKeyInput.addEventListener('input', handleApiKeyChange);
        
        return () => {
          fileIdInput.removeEventListener('input', handleFileIdChange);
          apiKeyInput.removeEventListener('input', handleApiKeyChange);
        };
      }
      
      return () => {};
    };
    
    // Also listen for the language-selected event to automatically extract the M3U8 URL
    const handleLanguageSelected = (e: Event) => {
      console.log("Language selected event detected");
      
      // Extract data from event
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.fileId && customEvent.detail.apiKey) {
        const { fileId, apiKey } = customEvent.detail;
        console.log("Got credentials from event, fetching M3U8 directly", 
                   fileId ? "fileId present" : "no fileId", 
                   apiKey ? "apiKey present" : "no apiKey");
        
        // Directly fetch M3U8 URL with the provided credentials
        fetchM3U8WithCredentials(fileId, apiKey);
      } else {
        // Fallback to checking input fields
        setTimeout(() => {
          console.log("Checking input fields after language selection");
          checkForCredentials();
        }, 300);
      }
    };
    
    document.addEventListener('language-selected', handleLanguageSelected);
    
    const cleanup = setupChangeListeners();
    return () => {
      cleanup();
      document.removeEventListener('language-selected', handleLanguageSelected);
    };
  }, [extractionUrl]);

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
    
    if (hlsRef.current && hlsRef.current.levels && hlsRef.current.levels.length > 0) {
      if (quality === 'auto') {
        hlsRef.current.currentLevel = -1; // Auto quality
      } else {
        // Find the matching quality level
        const level = hlsRef.current.levels.findIndex(l => 
          `${l.height}p` === quality
        );
        if (level !== -1) {
          hlsRef.current.currentLevel = level;
        }
      }
    }
    
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
    
    // Clear any existing encrypted URL first to avoid UI glitches
    setEncryptedUrl("");
    
    // Simple "encryption" by encoding the URL - in a real app this would be more secure
    try {
      const encodedUrl = btoa(m3u8Url);
      const appUrl = window.location.origin;
      const encryptedPlayerUrl = `${appUrl}/secure-player?token=${encodedUrl}`;
      
      // Small delay to prevent UI flicker
      setTimeout(() => {
        setEncryptedUrl(encryptedPlayerUrl);
        
        toast({
          title: "Encrypted URL Generated",
          description: "The secure player URL has been generated",
        });
      }, 100);
    } catch (error) {
      console.error("Error generating encrypted URL:", error);
      toast({
        title: "Error Generating URL",
        description: "Failed to generate encrypted URL",
        variant: "destructive",
      });
    }
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

  // Initialize HLS.js player when m3u8Url changes
  useEffect(() => {
    if (!videoRef.current || !m3u8Url) return;
    
    // Clean up existing HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Reset player state
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // Initialize HLS if supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      
      hls.loadSource(m3u8Url);
      hls.attachMedia(videoRef.current);
      
      // Save the HLS instance for later use
      hlsRef.current = hls;
      
      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        
        // Set available qualities based on HLS levels
        if (hls.levels && hls.levels.length > 0) {
          const qualities = hls.levels.map(level => 
            level.height ? `${level.height}p` : 'Unknown'
          );
          
          setAvailableQualities(['auto', ...qualities]);
        } else {
          setAvailableQualities(['auto']);
        }
      });
      
      // Handle errors
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('Fatal HLS error:', data);
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              toast({
                title: "Network Error",
                description: "Connection failed. Trying to recover...",
                variant: "destructive",
              });
              hls.startLoad(); // Try to recover
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              toast({
                title: "Media Error",
                description: "Stream playback failed. Trying to recover...",
                variant: "destructive",
              });
              hls.recoverMediaError(); // Try to recover
              break;
              
            default:
              toast({
                title: "Fatal Error",
                description: "Cannot play this stream. The URL may be invalid or expired.",
                variant: "destructive",
              });
              break;
          }
        }
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = m3u8Url;
      setAvailableQualities(['auto']);
    } else {
      // No HLS support
      toast({
        title: "Browser Incompatible",
        description: "Your browser doesn't support HLS streams. Please try a different browser.",
        variant: "destructive",
      });
    }
    
    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [m3u8Url, toast]);
  
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
    <Card className="bg-gradient-to-br from-pink-900/40 to-orange-900/40 backdrop-blur-sm rounded-xl border border-pink-500/20 shadow-lg shadow-pink-500/20 overflow-hidden glow-card">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="h-6 w-6 text-pink-400 animate-pulse" />
          <h2 className="text-2xl font-bold gradient-text">Advanced M3U8 Player</h2>
        </div>
        
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
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onVolumeChange={() => setIsMuted(videoRef.current?.muted || false)}
                  onClick={togglePlay}
                  playsInline
                  controls={false}
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
                        <SkipBack className="h-6 w-6" />
                        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">-10s</span>
                      </button>
                      
                      <button 
                        onClick={togglePlay} 
                        className="text-white hover:text-primary focus:outline-none"
                      >
                        {isPlaying ? (
                          <Pause className="h-7 w-7" />
                        ) : (
                          <Play className="h-7 w-7" />
                        )}
                      </button>
                      
                      <button 
                        onClick={() => handleSkip(10)} 
                        className="text-white hover:text-primary focus:outline-none group relative controls-btn"
                      >
                        <SkipForward className="h-6 w-6" />
                        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">+10s</span>
                      </button>
                      
                      {/* Volume Control */}
                      <div className="hidden sm:flex items-center space-x-1 group relative">
                        <button 
                          onClick={toggleMute} 
                          className="text-white hover:text-primary focus:outline-none"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                        </button>
                        
                        <div className="w-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Slider
                            value={[volume]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                            className="cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Playback Speed */}
                      <div className="relative">
                        <button 
                          onClick={toggleSpeedOptions} 
                          className="text-white hover:text-primary focus:outline-none rounded-md px-2 py-1 text-xs"
                        >
                          <RotateCw className="h-5 w-5" />
                        </button>
                        
                        {showSpeedOptions && (
                          <div className="absolute right-0 bottom-10 bg-black/90 rounded-md py-2 px-1 w-40 z-10">
                            <div className="text-xs text-white font-medium px-2 pb-1 mb-1 border-b border-gray-700">
                              Playback Speed
                            </div>
                            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                              <button
                                key={speed}
                                onClick={() => changePlaybackSpeed(speed)}
                                className={`block w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded ${
                                  playbackSpeed === speed ? 'bg-primary/20 text-primary font-medium' : 'text-white'
                                }`}
                              >
                                {speed === 1 ? 'Normal' : `${speed}x`}
                                {playbackSpeed === speed && (
                                  <Check className="h-3 w-3 inline ml-2" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Quality Selection - only shown when HLS.js provides multiple qualities */}
                      {availableQualities.length > 1 && (
                        <div className="relative hidden sm:block">
                          <button 
                            onClick={toggleQualityOptions}
                            className="text-white hover:text-primary focus:outline-none rounded-md px-2 py-1 text-xs"
                          >
                            <Settings className="h-5 w-5" />
                          </button>
                          
                          {showQualityOptions && (
                            <div className="absolute right-0 bottom-10 bg-black/90 rounded-md py-2 px-1 w-40 z-10">
                              <div className="text-xs text-white font-medium px-2 pb-1 mb-1 border-b border-gray-700">
                                Quality
                              </div>
                              {availableQualities.map(quality => (
                                <button
                                  key={quality}
                                  onClick={() => setQuality(quality)}
                                  className={`block w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded ${
                                    selectedQuality === quality ? 'bg-primary/20 text-primary font-medium' : 'text-white'
                                  }`}
                                >
                                  {quality}
                                  {selectedQuality === quality && (
                                    <Check className="h-3 w-3 inline ml-2" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Fullscreen */}
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
            
            {/* Encrypted Stream URL Tab */}
            <TabsContent value="encrypted" className="mt-0">
              <div className="aspect-video bg-black relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <h3 className="text-white text-xl font-semibold mb-6">Share Encrypted Stream</h3>
                  
                  <div className="w-full max-w-xl space-y-6">
                    <div className="space-y-2">
                      <p className="text-gray-300 text-sm">
                        Generate an encrypted URL that can be shared with others. The URL contains the stream data without exposing the actual M3U8 URL.
                      </p>
                      
                      <div className="flex justify-center">
                        <Button
                          onClick={generateEncryptedUrl}
                          className="bg-primary hover:bg-blue-600 text-white"
                        >
                          Generate Encrypted URL
                        </Button>
                      </div>
                    </div>
                    
                    {encryptedUrl && (
                      <div className="space-y-3 bg-gray-900/50 p-4 rounded-md">
                        <div className="space-y-1">
                          <p className="text-gray-300 text-sm mb-1">Encrypted Stream URL:</p>
                          <div className="bg-black/40 p-3 rounded overflow-auto text-sm font-mono text-gray-200 max-h-20">
                            {encryptedUrl}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => copyToClipboard(encryptedUrl)}
                            className="bg-gray-700 hover:bg-gray-600 text-white flex-1"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-4 w-4 mr-2" /> Copied!
                              </>
                            ) : (
                              <>
                                <Clipboard className="h-4 w-4 mr-2" /> Copy URL
                              </>
                            )}
                          </Button>
                          
                          <Button 
                            asChild
                            className="bg-gray-700 hover:bg-gray-600 text-white flex-1"
                          >
                            <a href={encryptedUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" /> Open Player
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg">
            <div className="text-center max-w-lg space-y-3">
              <MonitorPlay className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="text-lg font-medium text-gray-700">No stream URL available</h3>
              <p className="text-sm text-gray-500">
                Search for a media file using the Media Information Search section, then select a language. The player will automatically load the stream.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}