require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // This line loads the .env file

/** @type import('hardhat/config').HardhatUserConfig */

// Read environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.24" },
      { version: "0.8.20" },
    ],
  },
  networks: {
    // Local testing
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Sepolia testnet
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
};