import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function CodeGenerator() {
  // Track whether credentials should be shown
  const [credentialsVisible, setCredentialsVisible] = useState(false);
  
  // Auto-open credentials if needed (when language is selected)
  useEffect(() => {
    // We use a custom event to listen for language selections
    const handleLanguageSelected = () => {
      setCredentialsVisible(true);
      
      // Automatically update code after a short delay
      setTimeout(() => {
        handleUpdateCode(new Event('submit') as React.FormEvent);
      }, 200);
    };
    
    document.addEventListener('language-selected', handleLanguageSelected);
    
    return () => {
      document.removeEventListener('language-selected', handleLanguageSelected);
    };
  }, []);
  // Original code template and initial values
  const originalCode = `fetch('https://oplij.koyeb.app/api/v1/getStream',
 { method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(
{ file: 'YOUR_FILE_ID', 
 key: 'YOUR_API_KEY' }
)}) 
 .then(response => response.json()) 
 .then(data => {
   console.log(data);
   // Auto-extract direct URL
   if (data.success && data.data && data.data.link) {
     console.log('Direct URL:', data.data.link);
     navigator.clipboard.writeText(data.data.link)
       .then(() => console.log('✓ Direct URL copied to clipboard!'))
       .catch(err => console.error('Failed to copy URL:', err));
   }
 }) 
 .catch(error =>  console.error(error));`;
  
  const initialFileId = '';
  const initialApiKey = '';

  // State
  const [fileId, setFileId] = useState(initialFileId);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [currentCode, setCurrentCode] = useState(originalCode);
  const [currentFileId, setCurrentFileId] = useState(initialFileId);
  const [currentApiKey, setCurrentApiKey] = useState(initialApiKey);
  const [fileIdError, setFileIdError] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isBlurred, setIsBlurred] = useState(true); // Default to blurred state
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false); // Default to closed credentials section
  const codeSectionRef = useRef<HTMLDivElement>(null);
  
  // Handle input change events (needed for integration with MediaInfoSearch)
  useEffect(() => {
    const fileIdInput = document.getElementById("fileId") as HTMLInputElement;
    const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
    
    if (fileIdInput && apiKeyInput) {
      // Listen for input events on fileId input
      const handleFileIdInput = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setFileId(value);
      };
      
      // Listen for input events on apiKey input
      const handleApiKeyInput = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setApiKey(value);
      };
      
      fileIdInput.addEventListener('input', handleFileIdInput);
      apiKeyInput.addEventListener('input', handleApiKeyInput);
      
      return () => {
        fileIdInput.removeEventListener('input', handleFileIdInput);
        apiKeyInput.removeEventListener('input', handleApiKeyInput);
      };
    }
  }, []);
  
  const { toast } = useToast();

  // Update code with new credentials
  const handleUpdateCode = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error states
    setFileIdError(false);
    setApiKeyError(false);
    
    // Validate inputs
    let isValid = true;
    
    if (!fileId.trim()) {
      setFileIdError(true);
      isValid = false;
    }
    
    if (!apiKey.trim()) {
      setApiKeyError(true);
      isValid = false;
    }
    
    if (!isValid) return;
    
    // Create a new code snippet with updated values and auto-extract URL functionality
    const codeTemplate = `fetch('https://oplij.koyeb.app/api/v1/getStream',
 { method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(
{ file: '${fileId}', 
 key: '${apiKey}' }
)}) 
 .then(response => response.json()) 
 .then(data => {
   console.log(data);
   // Auto-extract and copy the direct M3U8 URL
   if (data.success && data.data && data.data.link) {
     const directUrl = data.data.link;
     console.log('----------------------------------------');
     console.log('DIRECT M3U8 URL:');
     console.log(directUrl);
     console.log('----------------------------------------');
     
     // Copy to clipboard automatically
     navigator.clipboard.writeText(directUrl)
       .then(() => console.log('✓ Direct URL copied to clipboard! Ready to paste anywhere.'))
       .catch(err => console.error('Failed to copy URL:', err));
   }
 }) 
 .catch(error => console.error(error));`;
    
    const updatedCode = codeTemplate;
    
    setCurrentCode(updatedCode);
    setCurrentFileId(fileId);
    setCurrentApiKey(apiKey);
    setIsUpdated(true);
    
    // Apply flash animation to code section
    if (codeSectionRef.current) {
      codeSectionRef.current.classList.add('flash-success');
      setTimeout(() => {
        if (codeSectionRef.current) {
          codeSectionRef.current.classList.remove('flash-success');
        }
      }, 1500);
    }
    
    // Hide update indicator after 3 seconds
    setTimeout(() => {
      setIsUpdated(false);
    }, 3000);
  };
  
  // Copy code to clipboard
  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(currentCode)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "Failed to copy",
          description: "Please try again",
          variant: "destructive"
        });
      });
  };

  // Add flash animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .flash-success {
        animation: flash-success 1.5s ease-in-out;
      }
      @keyframes flash-success {
        0%, 100% { background-color: transparent; }
        50% { background-color: rgba(16, 185, 129, 0.1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Card className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Input Section with Collapsible */}
      <section className="p-6 border-b border-gray-200">
        <Collapsible 
          open={isCredentialsOpen} 
          onOpenChange={setIsCredentialsOpen}
          className="w-full"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Credentials</h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                {isCredentialsOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
                <span className="ml-2 text-sm text-gray-600">
                  {isCredentialsOpen ? "Hide" : "Show"}
                </span>
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="mt-4">
            <form onSubmit={handleUpdateCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fileId" className="font-medium text-gray-700">File ID</Label>
                <div className="relative">
                  <Input
                    id="fileId"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary blur-sm hover:blur-sm focus:blur-sm"
                    placeholder="e.g. ~8i-Mu-WONoEdJ9whQe+Ldow..."
                    readOnly
                  />
                </div>
                {fileIdError && (
                  <p className="text-error text-sm">Please enter a valid File ID</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="font-medium text-gray-700">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary blur-sm hover:blur-sm focus:blur-sm"
                    placeholder="e.g. rcbeUV3KoCw-dSFJ-vN$-JwI4OXlCmOaAx05HkWyclbx46SNcazmpYmnFTXoNjo"
                    readOnly
                  />
                </div>
                {apiKeyError && (
                  <p className="text-error text-sm">Please enter a valid API Key</p>
                )}
              </div>
              
              <Button 
                type="submit"
                className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-md transition duration-200"
              >
                Update Code
              </Button>
            </form>
          </CollapsibleContent>
        </Collapsible>
      </section>
      
      {/* Hidden Code Display Section - still functional but not visible to users */}
      <div className="hidden">
        <div ref={codeSectionRef}>
          <SyntaxHighlighter
            language="javascript"
            style={atomOneDark}
          >
            {currentCode}
          </SyntaxHighlighter>
        </div>
      </div>
    </Card>
  );
}
