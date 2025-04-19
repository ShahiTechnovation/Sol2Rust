import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ConversionPanel } from "@/components/conversion-panel";
import { FeatureCard } from "@/components/feature-card";
import { DeploymentModal } from "@/components/deployment-modal";
import { WalletState } from "@/lib/web3";
import { Code, Wallet, Layers } from "lucide-react";
import { GitHubLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";

export default function Home() {
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [rustCodeToDeploy, setRustCodeToDeploy] = useState("");
  
  const handleWalletConnect = (state: WalletState) => {
    setWalletState(state);
  };
  
  const handleNetworkChange = (chainId: number) => {
    if (walletState) {
      setWalletState({
        ...walletState,
        chainId,
        chainName: getChainName(chainId)
      });
    }
  };
  
  const handleDeployClick = (rustCode: string) => {
    setRustCodeToDeploy(rustCode);
    setIsDeployModalOpen(true);
  };
  
  return (
    <div className="min-h-screen bg-light font-sans">
      <AppHeader 
        walletState={walletState} 
        onWalletConnect={handleWalletConnect}
        onNetworkChange={handleNetworkChange}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ConversionPanel 
          walletState={walletState}
          onDeployClick={handleDeployClick}
        />
        
        {/* Features Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Features
            </h3>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Code className="h-6 w-6 text-primary" />}
                title="Smart Code Conversion"
                description="AI-powered conversion from Solidity to Rust with support for common contract patterns."
              />
              <FeatureCard
                icon={<Wallet className="h-6 w-6 text-primary" />}
                title="Wallet Integration"
                description="Connect your favorite wallet (MetaMask, etc.) to deploy converted contracts directly."
              />
              <FeatureCard
                icon={<Layers className="h-6 w-6 text-primary" />}
                title="Multi-Chain Support"
                description="Deploy your converted contracts on Ethereum, Polygon, Optimism, Arbitrum, and more."
              />
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a href="#" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">GitHub</span>
              <GitHubLogoIcon className="h-6 w-6" />
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Twitter</span>
              <TwitterLogoIcon className="h-6 w-6" />
            </a>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; 2023 Sol2Rust. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      
      {/* Deployment Modal */}
      {walletState && (
        <DeploymentModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
          walletState={walletState}
          rustCode={rustCodeToDeploy}
        />
      )}
    </div>
  );
}

// Helper to get chain name from ID
function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum",
    137: "Polygon",
    10: "Optimism",
    42161: "Arbitrum",
    8453: "Base"
  };
  
  return chains[chainId] || "Unknown Network";
}
