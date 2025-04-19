import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WalletState, networks, connectWallet, switchNetwork } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";

interface AppHeaderProps {
  walletState: WalletState | null;
  onWalletConnect: (state: WalletState) => void;
  onNetworkChange: (chainId: number) => void;
}

export function AppHeader({ walletState, onWalletConnect, onNetworkChange }: AppHeaderProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const state = await connectWallet();
      onWalletConnect(state);
    } catch (error) {
      toast({
        title: "Wallet Connection Failed",
        description: error instanceof Error ? error.message : "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleNetworkChange = async (value: string) => {
    const network = networks.find(n => n.value === value);
    if (!network) return;
    
    try {
      const state = await switchNetwork(network.id);
      onNetworkChange(network.id);
      toast({
        title: "Network Changed",
        description: `Successfully switched to ${network.name}`,
      });
    } catch (error) {
      toast({
        title: "Network Switch Failed",
        description: error instanceof Error ? error.message : "Could not switch network",
        variant: "destructive",
      });
    }
  };
  
  // Truncate wallet address for display
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <svg className="h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <Link href="/">
                <span className="ml-2 text-xl font-bold text-gray-900 cursor-pointer">Sol2Rust</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <span className="border-primary text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer">
                  Converter
                </span>
              </Link>
              <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Documentation
              </a>
              <a href="#" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Examples
              </a>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {/* Network Selector */}
              <div className="relative inline-block text-left mr-4">
                <Select 
                  onValueChange={handleNetworkChange}
                  value={networks.find(n => n.id === walletState?.chainId)?.value || "ethereum"}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Select Network" />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map((network) => (
                      <SelectItem key={network.id} value={network.value}>
                        {network.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Wallet Connection Button */}
              {!walletState?.isConnected ? (
                <Button 
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="hidden md:inline-flex"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              ) : (
                <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-md px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                    {truncateAddress(walletState.address)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="sm:hidden" id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          <Link href="/">
            <span className="bg-gray-50 border-primary text-primary block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer">
              Converter
            </span>
          </Link>
          <a href="#" className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
            Documentation
          </a>
          <a href="#" className="border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">
            Examples
          </a>
        </div>
      </div>
    </header>
  );
}
