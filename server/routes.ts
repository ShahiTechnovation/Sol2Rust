import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { convertSolidityToRust, compileRustToEVM } from "./conversion";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Endpoints
  
  // Convert Solidity to Rust
  app.post("/api/convert", async (req, res) => {
    try {
      const { solidityCode } = req.body;
      
      if (!solidityCode) {
        return res.status(400).json({
          success: false,
          error: "Solidity code is required"
        });
      }
      
      const result = await convertSolidityToRust(solidityCode);
      res.json(result);
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      });
    }
  });
  
  // Compile Rust to EVM bytecode
  app.post("/api/compile", async (req, res) => {
    try {
      const { rustCode, contractName } = req.body;
      
      if (!rustCode) {
        return res.status(400).json({
          success: false,
          error: "Rust code is required"
        });
      }
      
      if (!contractName) {
        return res.status(400).json({
          success: false,
          error: "Contract name is required"
        });
      }
      
      const result = await compileRustToEVM(rustCode, contractName);
      res.json(result);
    } catch (error) {
      console.error("Compilation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
