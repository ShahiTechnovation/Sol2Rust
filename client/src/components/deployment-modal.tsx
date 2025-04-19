import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { WalletState, deployContract, getExplorerUrl } from "@/lib/web3";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  rustCode: string;
}

export function DeploymentModal({ isOpen, onClose, walletState, rustCode }: DeploymentModalProps) {
  const [contractName, setContractName] = useState("Token");
  const [constructorArgs, setConstructorArgs] = useState('["My Token", "MTK", "8", "1000"]');
  const [gasLimit, setGasLimit] = useState(3000000);
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentSuccess, setDeploymentSuccess] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  const resetState = () => {
    setIsDeploying(false);
    setDeploymentError(null);
    setDeploymentSuccess(false);
    setContractAddress(null);
    setTransactionHash(null);
  };
  
  const handleClose = () => {
    resetState();
    onClose();
  };
  
  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeploymentError(null);
    setDeploymentSuccess(false);
    
    try {
      const result = await deployContract({
        rustCode,
        contractName,
        constructorArgs,
        gasLimit,
        chainId: walletState.chainId
      });
      
      if (result.success && result.contractAddress) {
        setDeploymentSuccess(true);
        setContractAddress(result.contractAddress);
        setTransactionHash(result.transactionHash || "");
      } else {
        setDeploymentError(result.error || "Deployment failed for unknown reason");
      }
    } catch (error) {
      setDeploymentError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsDeploying(false);
    }
  };
  
  const explorerUrl = contractAddress 
    ? getExplorerUrl(walletState.chainId, contractAddress)
    : "";
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary bg-opacity-10">
            <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <DialogTitle className="text-center">Deploy Contract</DialogTitle>
          <DialogDescription className="text-center">
            You're about to deploy your converted Rust contract to <span className="font-medium">{walletState.chainName}</span>. 
            This will require a transaction from your connected wallet.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="contract-name">Contract Name</Label>
            <Input 
              id="contract-name" 
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              placeholder="SimpleStorage"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="constructor-args">Constructor Arguments (JSON)</Label>
            <Textarea 
              id="constructor-args" 
              value={constructorArgs}
              onChange={(e) => setConstructorArgs(e.target.value)}
              placeholder='["My Token", "MTK", "8", "1000"]'
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              For Token contract: ["name", "symbol", "decimals", "initialSupply"]
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="gas-limit">Gas Limit</Label>
              <span className="text-sm text-gray-500">Estimated: 210,000</span>
            </div>
            <Input 
              id="gas-limit" 
              type="number"
              value={gasLimit}
              onChange={(e) => setGasLimit(parseInt(e.target.value))}
            />
          </div>
          
          {/* Deployment Status */}
          {isDeploying && (
            <Alert variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              <AlertTitle>Deploying</AlertTitle>
              <AlertDescription>
                Deploying your contract...
              </AlertDescription>
            </Alert>
          )}
          
          {/* Deployment Success */}
          {deploymentSuccess && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Successfully deployed!</AlertTitle>
              <AlertDescription>
                <div className="mt-2 text-sm">
                  <p>Contract Address: <span className="font-mono">{contractAddress}</span></p>
                  <p className="mt-1">
                    <a 
                      href={explorerUrl} 
                      className="font-medium text-green-700 hover:text-green-600 inline-flex items-center" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      View on Explorer
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Deployment Error */}
          {deploymentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Deployment failed</AlertTitle>
              <AlertDescription>
                {deploymentError}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleDeploy}
            disabled={isDeploying || deploymentSuccess}
          >
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              'Deploy Contract'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
