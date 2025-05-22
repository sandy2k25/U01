import CodeGenerator from "@/components/CodeGenerator";
import MediaInfoSearch from "@/components/MediaInfoSearch";
import DirectM3U8Extractor from "@/components/DirectM3U8Extractor";
import ThemeToggle from "@/components/ThemeToggle";
import { Link } from "wouter";
import { Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-background text-foreground">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">WovIeX 2.0</h1>
            <p className="text-muted-foreground">Search files and generate streaming URLs</p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="space-y-8">
          <MediaInfoSearch />
          
          <CodeGenerator />
          
          <DirectM3U8Extractor />
        </div>
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>These tools help you search media information and generate API code with your credentials.</p>
        </footer>
      </div>
    </div>
  );
}
