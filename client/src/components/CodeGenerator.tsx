import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Check } from "lucide-react";
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function CodeGenerator() {
  // Original code template and initial values
  const originalCode = `fetch('https://oplij.koyeb.app/api/v1/getStream',
 { method: 'POST', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(
{ file: '~8i-Mu-WONoEdJ9whQe+Ldow...', 
 key: 'rcbeUV3KoCw-dSFJ-vN$-JwI4OXlCmOaAx05HkWyclbx46SNcazmpYmnFTXoNjo' }
)}) 
 .then(response => response.json()) 
 .then(data =>  console.log(data)) 
 .catch(error =>  console.error(error));`;
  
  const initialFileId = '~8i-Mu-WONoEdJ9whQe+Ldow...';
  const initialApiKey = 'rcbeUV3KoCw-dSFJ-vN$-JwI4OXlCmOaAx05HkWyclbx46SNcazmpYmnFTXoNjo';

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
  const codeSectionRef = useRef<HTMLDivElement>(null);
  
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
    
    // Update code with new values - using a simpler, more reliable approach
    let codeLines = originalCode.split('\n');

    // Find and replace the file line
    for (let i = 0; i < codeLines.length; i++) {
      if (codeLines[i].includes("file:")) {
        codeLines[i] = codeLines[i].replace(/file:.*?,/, `file: '${fileId}',`);
      }
      if (codeLines[i].includes("key:")) {
        codeLines[i] = codeLines[i].replace(/key:.*?[}]/, `key: '${apiKey}'}`);
      }
    }
    
    const updatedCode = codeLines.join('\n');
    
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
      {/* Input Section */}
      <section className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Enter New Credentials</h2>
        <form onSubmit={handleUpdateCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileId" className="font-medium text-gray-700">File ID</Label>
            <Input
              id="fileId"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g. ~8i-Mu-WONoEdJ9whQe+Ldow..."
            />
            {fileIdError && (
              <p className="text-error text-sm">Please enter a valid File ID</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="font-medium text-gray-700">API Key</Label>
            <Input
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="e.g. rcbeUV3KoCw-dSFJ-vN$-JwI4OXlCmOaAx05HkWyclbx46SNcazmpYmnFTXoNjo"
            />
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
      </section>
      
      {/* Code Display Section */}
      <section className="p-6" ref={codeSectionRef}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Generated Code</h2>
          <div className="flex items-center space-x-2">
            {isUpdated && (
              <span className="text-sm text-gray-500">Code updated</span>
            )}
            <Button
              onClick={copyCodeToClipboard}
              variant={isCopied ? "default" : "secondary"}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition duration-200 ${
                isCopied ? 'bg-success text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              size="sm"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="relative rounded-md overflow-hidden">
          <SyntaxHighlighter
            language="javascript"
            style={atomOneDark}
            customStyle={{
              padding: '1rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              maxHeight: '24rem',
            }}
          >
            {currentCode}
          </SyntaxHighlighter>
        </div>
      </section>
    </Card>
  );
}
