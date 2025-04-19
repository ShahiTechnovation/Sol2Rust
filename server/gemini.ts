import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API with your API key
const apiKey = "AIzaSyDcGpe9on3ubnD5e1SfFkhqkKXsme9QMw8"; // Using the provided API key
const genAI = new GoogleGenerativeAI(apiKey);

// Function to convert Solidity to Rust using Gemini API
export async function convertWithGemini(solidityCode: string): Promise<string> {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Create the prompt
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

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Clean up any markdown format
    return text.replace(/```rust|```/g, "").trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

// Function to simulate compiling Rust to EVM bytecode
export async function simulateCompileWithGemini(rustCode: string, contractName: string): Promise<any> {
  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Create the prompt
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

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[2];
      return JSON.parse(jsonStr);
    }

    // If no JSON format is found in the response, try to parse the whole text
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API error during compilation simulation:", error);
    throw error;
  }
}