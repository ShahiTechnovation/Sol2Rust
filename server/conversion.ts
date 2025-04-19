// Import the Gemini functions
import { convertWithGemini, simulateCompileWithGemini } from "./gemini";

export interface ConversionResult {
  rustCode: string;
  success: boolean;
  error?: string;
}

export interface CompilationResult {
  abi: any[];
  bytecode: string;
  success: boolean;
  error?: string;
}

/**
 * Convert Solidity code to Rust using Gemini
 */
export async function convertSolidityToRust(solidityCode: string): Promise<ConversionResult> {
  try {
    // Use the Gemini API for conversion
    const rustCode = await convertWithGemini(solidityCode);
    
    if (!rustCode) {
      throw new Error("Failed to generate Rust code");
    }
    
    return {
      rustCode,
      success: true,
    };
  } catch (error) {
    console.error("Gemini conversion error:", error);
    return {
      rustCode: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during conversion",
    };
  }
}

/**
 * This simulates compiling Rust code to EVM bytecode
 * In a real implementation, this would use a proper Rust compiler
 */
export async function compileRustToEVM(rustCode: string, contractName: string): Promise<CompilationResult> {
  try {
    // Use the Gemini API to simulate compilation
    const compiledOutput = await simulateCompileWithGemini(rustCode, contractName);
    
    if (!compiledOutput.abi || !compiledOutput.bytecode) {
      throw new Error("Failed to compile Rust code to EVM bytecode");
    }
    
    return {
      abi: compiledOutput.abi,
      bytecode: compiledOutput.bytecode,
      success: true,
    };
  } catch (error) {
    console.error("Compilation error:", error);
    return {
      abi: [],
      bytecode: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during compilation",
    };
  }
}
