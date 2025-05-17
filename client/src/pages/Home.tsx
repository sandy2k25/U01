import CodeGenerator from "@/components/CodeGenerator";
import MediaInfoSearch from "@/components/MediaInfoSearch";
import DirectM3U8Extractor from "@/components/DirectM3U8Extractor";
import { Link } from "wouter";
import { Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">WovIeX 2.0</h1>
            <p className="text-gray-600">Search files and generate streaming URLs</p>
          </div>
        </header>

        <div className="space-y-8">
          <MediaInfoSearch />
          
          <CodeGenerator />
          
          <DirectM3U8Extractor />
        </div>
        
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>These tools help you search media information and generate API code with your credentials.</p>
        </footer>
      </div>
    </div>
  );
}
