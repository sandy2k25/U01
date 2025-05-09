import CodeGenerator from "@/components/CodeGenerator";

export default function Home() {
  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">API Code Generator</h1>
          <p className="text-gray-600">Update your API credentials and generate ready-to-use code</p>
        </header>

        <CodeGenerator />
        
        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>This tool helps you generate API code with your credentials.</p>
        </footer>
      </div>
    </div>
  );
}
