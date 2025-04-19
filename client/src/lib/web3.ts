import { ethers, BrowserProvider, JsonRpcSigner } from "ethers";

// Add the window.ethereum type for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { apiRequest } from "./queryClient";

export interface WalletState {
  isConnected: boolean;
  address: string;
  chainId: number;
  chainName: string;
}

export const networks = [
  { id: 1, name: "Ethereum", value: "ethereum", explorer: "https://etherscan.io/address/" },
  { id: 137, name: "Polygon", value: "polygon", explorer: "https://polygonscan.com/address/" },
  { id: 10, name: "Optimism", value: "optimism", explorer: "https://optimistic.etherscan.io/address/" },
  { id: 42161, name: "Arbitrum", value: "arbitrum", explorer: "https://arbiscan.io/address/" },
  { id: 8453, name: "Base", value: "base", explorer: "https://basescan.org/address/" }
];

export async function connectWallet(): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet detected. Please install MetaMask or another wallet.");
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    // Find network name
    const networkInfo = networks.find(n => n.id === chainId) || { name: "Unknown Network" };
    
    return {
      isConnected: true,
      address,
      chainId,
      chainName: networkInfo.name
    };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to connect wallet");
  }
}

export async function switchNetwork(chainId: number): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet detected");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    
    // Re-fetch wallet state after network switch
    return await connectWallet();
  } catch (error) {
    console.error("Error switching network:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to switch network");
  }
}

interface DeploymentParams {
  rustCode: string;
  contractName: string;
  constructorArgs: string;
  gasLimit: number;
  chainId: number;
}

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  error?: string;
}

export async function deployContract(params: DeploymentParams): Promise<DeploymentResult> {
  if (!window.ethereum) {
    throw new Error("No Ethereum wallet detected");
  }

  try {
    // First, we send the Rust code to our backend for compilation
    const compilationResponse = await apiRequest("POST", "/api/compile", {
      rustCode: params.rustCode,
      contractName: params.contractName
    });
    
    if (!compilationResponse.ok) {
      const errorData = await compilationResponse.json();
      throw new Error(errorData.error || "Compilation failed");
    }
    
    const { abi, bytecode } = await compilationResponse.json();
    
    // Connect to the provider and signer
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Parse constructor arguments
    let constructorArgs: any[] = [];
    try {
      const parsedArgs = JSON.parse(params.constructorArgs);
      // Ensure constructor args is an array
      constructorArgs = Array.isArray(parsedArgs) ? parsedArgs : Object.values(parsedArgs);
    } catch (e) {
      console.error("Error parsing constructor args:", e);
      // Use empty array for constructor args if parsing fails
      constructorArgs = [];
    }
    
    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    
    // Deploy contract - handle both with and without constructor args
    const deployOptions = { gasLimit: params.gasLimit };
    const contract = constructorArgs.length > 0 
      ? await factory.deploy(...constructorArgs, deployOptions)
      : await factory.deploy(deployOptions);
    
    // Wait for deployment
    const deploymentTx = contract.deploymentTransaction();
    if (!deploymentTx) {
      throw new Error("Failed to get deployment transaction");
    }
    
    await deploymentTx.wait();
    
    return {
      success: true,
      contractAddress: await contract.getAddress(),
      transactionHash: deploymentTx.hash
    };
  } catch (error) {
    console.error("Deployment error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during deployment"
    };
  }
}

// Helper to get network explorer URL by chain ID
export function getExplorerUrl(chainId: number, address: string): string {
  const network = networks.find(n => n.id === chainId);
  if (!network) return `https://etherscan.io/address/${address}`;
  return `${network.explorer}${address}`;
}
