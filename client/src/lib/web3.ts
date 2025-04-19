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
  { id: 1, name: "Ethereum", value: "ethereum", explorer: "https://etherscan.io/address/", deployDirectly: true },
  { id: 137, name: "Polygon", value: "polygon", explorer: "https://polygonscan.com/address/", deployDirectly: true },
  { id: 10, name: "Optimism", value: "optimism", explorer: "https://optimistic.etherscan.io/address/", deployDirectly: true },
  { id: 42161, name: "Arbitrum", value: "arbitrum", explorer: "https://arbiscan.io/address/", deployDirectly: true },
  { id: 8453, name: "Base", value: "base", explorer: "https://basescan.org/address/", deployDirectly: true },
  { id: 421613, name: "Arbitrum Goerli", value: "arbitrum-goerli", explorer: "https://goerli.arbiscan.io/address/", deployDirectly: true }
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
    
    // Set deployment options based on the network
    const network = networks.find(n => n.id === params.chainId);
    
    // Base deployment options
    let deployOptions: any = { 
      gasLimit: params.gasLimit
    };
    
    // Different networks have different requirements
    if (params.chainId === 42161 || params.chainId === 421613) {
      // Arbitrum-specific settings
      deployOptions = {
        ...deployOptions,
        // Arbitrum doesn't use gasPrice, it uses maxFeePerGas and maxPriorityFeePerGas
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei')
      };
    } else {
      // Default for other networks
      deployOptions.gasPrice = 10000000000; // 10 gwei
    }
    
    console.log(`Deploying on ${network?.name || 'Unknown Network'} with options:`, deployOptions);
    
    // Deploy contract - handle both with and without constructor args
    let contract;
    try {
      // Get the current nonce to avoid nonce errors
      const nonce = await signer.getNonce();
      console.log("Using nonce:", nonce);
      
      // Update deployment options with nonce
      deployOptions.nonce = nonce;
      
      // For Arbitrum specifically, avoid ENS lookups which can cause issues
      if (params.chainId === 42161 || params.chainId === 421613) {
        // Process constructor arguments properly for Token contracts
        // Examine the abi to properly format the constructor arguments
        const constructorAbiItem = abi.find((item: any) => item.type === 'constructor');
        
        // For tokens, let's provide a completely fixed set of arguments 
        // based on the ABI structure rather than trying to parse user input
        if (params.contractName.toLowerCase().includes('token')) {
          console.log("Detected a Token contract, using fixed argument structure");
          
          // Define default values for token contract
          const defaultArgs = {
            name: "MyToken",
            symbol: "MTK",
            decimals: 18,
            totalSupply: 1000000
          };
          
          // Create correctly typed arguments based on ABI
          const typedArgs: any[] = [];
          
          if (constructorAbiItem && constructorAbiItem.inputs) {
            constructorAbiItem.inputs.forEach((input: any, index: number) => {
              const inputType = input.type || '';
              const inputName = input.name || '';
              
              console.log(`Processing input: ${inputName} (${inputType}) at index ${index}`);
              
              // Map user input to correctly typed values
              if (inputType.includes('string')) {
                // For string types, use string values from user input or defaults
                if (index === 0 && typeof constructorArgs[0] === 'string' && constructorArgs[0].trim()) {
                  typedArgs.push(constructorArgs[0].trim());
                } else if (index === 1 && typeof constructorArgs[1] === 'string' && constructorArgs[1].trim()) {
                  typedArgs.push(constructorArgs[1].trim());
                } else if (inputName.includes('name')) {
                  typedArgs.push(defaultArgs.name);
                } else if (inputName.includes('symbol')) {
                  typedArgs.push(defaultArgs.symbol);
                } else {
                  typedArgs.push("");
                }
              } 
              else if (inputType.includes('uint')) {
                // For number types, ensure we have valid numbers
                let numValue = 0;
                
                if (typeof constructorArgs[index] === 'number') {
                  numValue = constructorArgs[index];
                } 
                else if (typeof constructorArgs[index] === 'string') {
                  numValue = parseInt(constructorArgs[index], 10) || 0;
                  if (isNaN(numValue)) numValue = 0;
                }
                
                // Choose appropriate defaults based on parameter name
                if (inputName.includes('decimal')) {
                  // Decimals usually 18 for ERC20, but allow user override if valid
                  numValue = numValue || defaultArgs.decimals;
                } 
                else if (inputName.includes('supply') || inputName.includes('amount')) {
                  // Supply usually a large number
                  numValue = numValue || defaultArgs.totalSupply;
                }
                
                typedArgs.push(numValue);
              } 
              else if (inputType.includes('address')) {
                // For address types, use zero address as default or user input if valid
                if (typeof constructorArgs[index] === 'string' && 
                    constructorArgs[index].startsWith('0x') && 
                    constructorArgs[index].length === 42) {
                  typedArgs.push(constructorArgs[index]);
                } else {
                  typedArgs.push('0x0000000000000000000000000000000000000000');
                }
              } 
              else if (inputType.includes('bool')) {
                // For boolean types
                if (typeof constructorArgs[index] === 'boolean') {
                  typedArgs.push(constructorArgs[index]);
                } else {
                  typedArgs.push(false);
                }
              } 
              else {
                // For any other type, use a safe default
                typedArgs.push(0);
              }
            });
          }
          
          console.log("Final correctly typed arguments:", typedArgs);
          constructorArgs = typedArgs;
        }
        // For other contract types, process arguments based on their types
        else if (constructorAbiItem && constructorAbiItem.inputs) {
          const processedArgs = constructorArgs.map((arg: any, index: number) => {
            const inputType = constructorAbiItem.inputs[index]?.type || '';
            console.log(`Processing arg[${index}]:`, arg, "of type:", inputType);
            
            // Handle different types specially
            if (inputType.includes('uint') && typeof arg === 'string') {
              // If arg is a string but should be a number
              if (arg === '' || isNaN(Number(arg))) {
                return 0; // Default to 0 for empty numeric fields
              }
              return Number(arg); // Convert to number
            }
            else if (inputType.includes('address') && typeof arg === 'string' && !arg.startsWith('0x')) {
              // If supposed to be an address but doesn't start with 0x
              return '0x0000000000000000000000000000000000000000';
            }
            return arg;
          });
          
          console.log("Processed constructor arguments:", processedArgs);
          constructorArgs = processedArgs;
        }
        
        // For Arbitrum, use a more direct approach that bypasses ENS
        console.log("Using direct bytecode deployment for Arbitrum");
        
        // Let's simplify for the Token contract to avoid ABI encoding issues
        let data = "";
        
        try {
          // Create factory transaction data manually with proper arguments
          data = factory.interface.encodeDeploy(
            constructorArgs.length > 0 ? constructorArgs : []
          );
          console.log("Encoded constructor arguments:", data);
          
          // If encoding fails or produces invalid data, use empty constructor args
          if (!data || data === "0x") {
            console.log("Empty constructor data, using default empty string");
            data = "0x";
          }
        } catch (encodeError) {
          console.error("Error encoding constructor arguments:", encodeError);
          data = "0x"; // Empty constructor data
        }
        
        // Create the transaction request manually
        // Be extremely careful with the bytecode concatenation - ensure it's valid
        // Make sure bytecode is a proper hex string starting with 0x
        const hexBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
        // For deploy data, we need to remove the '0x' prefix before concatenation
        const deployData = data.startsWith('0x') ? data.slice(2) : data;
        
        console.log("Contract bytecode length:", hexBytecode.length);
        console.log("Deploy data length:", deployData.length);
        
        // For simplicity and to avoid concatenation issues, let's use only the bytecode for now
        // This will work for contracts without constructor args or when args are causing issues
        let finalData = hexBytecode;
        
        // Only add constructor args if they're valid and needed
        if (deployData && deployData.length > 0 && deployData !== "0") {
          finalData = `${hexBytecode}${deployData}`;
        }
        
        console.log("Final transaction data length:", finalData.length);
        
        const transactionRequest = {
          data: finalData,
          ...deployOptions
        };
        
        // Send transaction directly
        console.log("Sending transaction:", transactionRequest);
        const tx = await signer.sendTransaction(transactionRequest);
        console.log("Deployment transaction sent:", tx.hash);
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        if (receipt && receipt.status === 0) {
          throw new Error("Transaction failed");
        }
        
        // Create a contract instance from the deployed contract
        const address = receipt?.contractAddress;
        if (!address) {
          throw new Error("Deployment failed - contract address not available");
        }
        
        contract = new ethers.Contract(address, abi, signer);
        
        // Manually create a deployment transaction property
        Object.defineProperty(contract, "deploymentTransaction", {
          value: () => tx,
          writable: false
        });
      } else {
        // Standard deployment for other networks
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
