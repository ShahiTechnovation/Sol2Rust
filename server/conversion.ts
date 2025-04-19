import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

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
 * Convert Solidity code to Rust using OpenAI
 */
export async function convertSolidityToRust(solidityCode: string): Promise<ConversionResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }
    
    const prompt = `
You are a smart contract language transpiler specialized in converting Solidity to Rust ink! smart contracts.
Convert the following Solidity code to equivalent Rust code using the ink! smart contract framework:

\`\`\`solidity
${solidityCode}
\`\`\`

Follow these rules:
1. Use the latest ink! contract syntax with #[ink::contract] and other appropriate annotations
2. Map Solidity types to appropriate Rust types (uint256 -> u128, address -> AccountId, etc.)
3. Convert events properly using #[ink(event)] and topics
4. Implement proper error handling using Result where appropriate
5. Ensure proper visibility modifiers (public -> pub, private -> private, etc.)
6. Don't include any explanations, only output valid Rust code
7. Format the code properly with correct indentation

Output only the Rust code, nothing else.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a smart contract language transpiler that converts Solidity to Rust ink! smart contracts." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Low temperature for more deterministic/consistent output
      max_tokens: 4000,
    });

    const rustCode = response.choices[0].message.content?.trim();
    
    if (!rustCode) {
      throw new Error("Failed to generate Rust code");
    }
    
    // Remove any markdown code blocks if present
    const cleanedRustCode = rustCode.replace(/```rust|```/g, "").trim();
    
    return {
      rustCode: cleanedRustCode,
      success: true,
    };
  } catch (error) {
    console.error("OpenAI conversion error:", error);
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
    // In a real implementation, this would compile the Rust code
    // For demonstration purposes, we'll use OpenAI to generate a mock ABI and bytecode
    
    const prompt = `
Generate a mock Ethereum contract ABI and bytecode for a contract named "${contractName}" from this Rust ink! code:

\`\`\`rust
${rustCode}
\`\`\`

Output should be in JSON format with two fields:
1. "abi": An array representing the contract ABI (function signatures, events, etc.)
2. "bytecode": A hexadecimal string representing the compiled bytecode

The output should be valid JSON that can be directly used with ethers.js.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a smart contract compiler assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const compiledOutput = JSON.parse(response.choices[0].message.content || "{}");
    
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
