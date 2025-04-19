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
      
      // Make sure we have the right number and type of arguments
      // If the first ABI entry is a constructor, check its inputs
      const constructorAbi = abi.find((item: any) => item.type === 'constructor');
      if (constructorAbi && constructorAbi.inputs) {
        // Match the number of arguments to the constructor inputs
        while (constructorArgs.length < constructorAbi.inputs.length) {
          // Add defaults based on type
          const nextInput = constructorAbi.inputs[constructorArgs.length];
          if (nextInput.type.includes('string')) {
            constructorArgs.push('');
          } else if (nextInput.type.includes('int')) {
            constructorArgs.push('0');
          } else if (nextInput.type.includes('bool')) {
            constructorArgs.push(false);
          } else if (nextInput.type.includes('address')) {
            constructorArgs.push('0x0000000000000000000000000000000000000000');
          } else {
            constructorArgs.push('0');
          }
        }
        
        // Trim any extra arguments
        constructorArgs = constructorArgs.slice(0, constructorAbi.inputs.length);
      }
    } catch (e) {
      console.error("Error parsing constructor args:", e);
      // Use empty array for constructor args if parsing fails
      constructorArgs = [];
    }
    
    console.log("Deploy with arguments:", constructorArgs);

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);
    
    // Set explicit gas price and limit for more reliable deployment
    const deployOptions = { 
      gasLimit: params.gasLimit,
      gasPrice: 10000000000 // 10 gwei
    };
    
    // Deploy contract - handle both with and without constructor args
    let contract;
    try {
      contract = constructorArgs.length > 0 
        ? await factory.deploy(...constructorArgs, deployOptions)
        : await factory.deploy(deployOptions);
        
      // Wait for deployment
      const deploymentTx = contract.deploymentTransaction();
      if (!deploymentTx) {
        throw new Error("Failed to get deployment transaction");
      }
      
      console.log("Deployment transaction:", deploymentTx.hash);
      
      // Wait for the transaction to be mined
      const receipt = await deploymentTx.wait();
      if (receipt && receipt.status === 0) {
        throw new Error("Transaction failed");
      }
    } catch (deployError: any) {
      console.error("Deployment transaction failed:", deployError);
      throw new Error(`Deployment failed: ${deployError.message || "Unknown error"}`);
    }
    
    if (!contract || !contract.deploymentTransaction()) {
      throw new Error("Deployment failed - contract or transaction not available");
    }
    
    return {
      success: true,
      contractAddress: await contract.getAddress(),
      transactionHash: contract.deploymentTransaction()!.hash
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
