import CodeGenerator from "@/components/CodeGenerator";
import MediaInfoSearch from "@/components/MediaInfoSearch";
import DirectM3U8Extractor from "@/components/DirectM3U8Extractor";
import ThemeToggle from "@/components/ThemeToggle";
import { FilmIcon, Flame, Clapperboard, Rocket, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Parallax effect for background
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="min-h-screen font-sans text-foreground relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-purple-950 to-blue-950 z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmZmZmYxMCIvPjwvc3ZnPg==')] opacity-10"></div>
        
        {/* Animated particles */}
        <div className="stars-container absolute inset-0 overflow-hidden">
          <div className="stars"></div>
          <div className="stars2"></div>
          <div className="stars3"></div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-5xl relative z-10">
        <header className="mb-10 md:mb-12 relative">
          <div className="absolute -top-5 -left-5 w-24 h-24 bg-blue-600 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-10 right-10 w-32 h-32 bg-purple-600 rounded-full blur-3xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">WovIeX 2.0</h1>
              </div>
              <p className="text-gray-300 text-lg max-w-md">Supercharged streaming experience with blazing fast speed</p>
            </div>
            <div className="flex items-center gap-4 p-2 backdrop-blur-md bg-white/5 rounded-full">
              <ThemeToggle />
            </div>
          </div>
        </header>
        
        {/* Curved background for content */}
        <div className="relative z-10 backdrop-blur-sm bg-black/30 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Top glow effect */}
          <div className="absolute -top-10 left-1/4 w-1/2 h-10 bg-blue-500/30 blur-2xl rounded-full"></div>
          
          <div className="p-6 md:p-8">
            {/* Progress bar/steps */}
            <div className="flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 flex justify-center items-center">
                <div className="h-1 bg-gray-700 w-full max-w-md"></div>
              </div>
              
              <div className="flex justify-between w-full max-w-md relative">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white z-10 border-2 border-blue-700 shadow-lg shadow-blue-900/50">
                    <FilmIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-gray-200 font-medium">Search Media</span>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-700 flex items-center justify-center text-white z-10 border-2 border-purple-700 shadow-lg shadow-purple-900/50">
                    <Clapperboard className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-gray-200 font-medium">Select Language</span>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-600 to-orange-700 flex items-center justify-center text-white z-10 border-2 border-pink-700 shadow-lg shadow-pink-900/50">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-gray-200 font-medium">Play Stream</span>
                </div>
              </div>
            </div>
            
            {/* Main content */}
            <div className="space-y-10">
              {/* Card 1: Search */}
              <div className="relative">
                <div className="absolute -top-20 -left-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
                <MediaInfoSearch />
              </div>
              
              {/* Card 2: Code Generator */}
              <div className="relative overflow-hidden">
                <div className="absolute -top-20 -right-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
                <CodeGenerator />
              </div>
              
              {/* Card 3: Player */}
              <div className="relative overflow-hidden">
                <div className="absolute -bottom-20 -left-10 w-40 h-40 bg-pink-600/20 rounded-full blur-3xl"></div>
                <DirectM3U8Extractor />
              </div>
            </div>
          </div>
        </div>
        
        <footer className="mt-10 text-center text-sm text-gray-400 opacity-80 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="h-4 w-4 text-orange-500" />
            <p className="font-semibold text-gray-300">Supercharged Streaming Experience</p>
          </div>
          <p>Enjoy seamless streaming with automated credential management and enhanced playback controls.</p>
        </footer>
      </div>
    </div>
  );
}
