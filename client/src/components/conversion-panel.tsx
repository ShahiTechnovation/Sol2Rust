import { useState } from "react";
import { Button } from "@/components/ui/button";
import { convertSolidityToRust, loadExampleSolidity } from "@/lib/openai";
import { CodeEditor } from "@/components/ui/code-editor";
import { useToast } from "@/hooks/use-toast";
import { WalletState } from "@/lib/web3";
import { Loader2, CheckCircle, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ConversionPanelProps {
  walletState: WalletState | null;
  onDeployClick: (rustCode: string) => void;
}

export function ConversionPanel({ walletState, onDeployClick }: ConversionPanelProps) {
  const [solidityCode, setSolidityCode] = useState<string>(
    `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    
    event ValueChanged(uint256 newValue);
    
    constructor(uint256 initialValue) {
        value = initialValue;
    }
    
    function setValue(uint256 newValue) public {
        value = newValue;
        emit ValueChanged(newValue);
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}`
  );
  
  const [rustCode, setRustCode] = useState<string>("// Your converted Rust code will appear here after conversion.\n// Click the \"Convert to Rust\" button to start the process.");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [isConverted, setIsConverted] = useState(false);
  const { toast } = useToast();

  const handleConversion = async () => {
    setIsConverting(true);
    setConversionError(null);
    setIsConverted(false);
    
    try {
      const result = await convertSolidityToRust(solidityCode);
      
      if (result.success) {
        setRustCode(result.rustCode);
        setIsConverted(true);
      } else {
        setConversionError(result.error || "Conversion failed. Please check your Solidity code and try again.");
      }
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsConverting(false);
    }
  };
  
  const handleClear = () => {
    setSolidityCode("// Enter your Solidity code here");
    setRustCode("// Your converted Rust code will appear here after conversion.");
    setIsConverted(false);
    setConversionError(null);
  };
  
  const handleLoadExample = async () => {
    try {
      const example = await loadExampleSolidity();
      setSolidityCode(example);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load example code",
        variant: "destructive",
      });
    }
  };
  
  const handleCopyRustCode = () => {
    navigator.clipboard.writeText(rustCode);
    toast({
      title: "Copied!",
      description: "Rust code copied to clipboard",
    });
  };
  
  const handleDeploy = () => {
    if (!isConverted) {
      toast({
        title: "Conversion Required",
        description: "Please convert the Solidity code first before deploying",
        variant: "destructive",
      });
      return;
    }
    
    if (!walletState?.isConnected) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to deploy the contract",
        variant: "destructive",
      });
      return;
    }
    
    onDeployClick(rustCode);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Solidity to Rust Contract Converter
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Enter your Solidity smart contract code and convert it to Rust for deployment on various blockchain networks.</p>
        </div>
        
        {/* Conversion Controls */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <Button 
            onClick={handleConversion} 
            disabled={isConverting}
            className="bg-secondary hover:bg-green-600"
          >
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowUp className="mr-2 h-4 w-4" />
                Convert to Rust
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleDeploy} 
            disabled={!isConverted || !walletState?.isConnected}
            className={!isConverted || !walletState?.isConnected ? "opacity-50 cursor-not-allowed" : ""}
          >
            <ArrowDown className="mr-2 h-4 w-4" />
            Deploy Contract
          </Button>
          
          <div className="flex-grow"></div>
          
          <div className="flex items-center space-x-4">
            <Button variant="link" onClick={handleLoadExample} className="text-primary">
              Load Example
            </Button>
            <Button variant="link" onClick={handleClear} className="text-gray-500">
              Clear
            </Button>
          </div>
        </div>
        
        {/* Conversion Status */}
        {isConverting && (
          <div className="mt-4">
            <Alert variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>
                Converting your Solidity code to Rust...
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Error Message */}
        {conversionError && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error during conversion</AlertTitle>
              <AlertDescription>
                {conversionError}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      
      {/* Code Editor Section */}
      <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solidity Editor */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Solidity Source</h4>
            <span className="text-xs text-gray-500">Input your Solidity smart contract</span>
          </div>
          <div className="relative flex-1">
            <CodeEditor
              value={solidityCode}
              onChange={setSolidityCode}
              language="solidity"
              height="400px"
            />
          </div>
        </div>
        
        {/* Rust Editor */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Rust Output</h4>
            <div className="flex items-center">
              {isConverted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Converted
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={handleCopyRustCode} className="text-gray-400 hover:text-gray-500">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="relative flex-1">
            <CodeEditor
              value={rustCode}
              language="rust"
              readOnly={true}
              height="400px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
