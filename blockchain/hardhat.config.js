require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // This line loads the .env file

/** @type import('hardhat/config').HardhatUserConfig */

// Get the private key from the .env file
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

module.exports = {
  solidity: "0.8.20",
  networks: {
    // Keep the localhost configuration for local testing
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Add the new network configuration for BlockDAG Testnet
    blockdag_testnet: {
      url: "https://rpc.primordial.bdagscan.com",
      accounts: [privateKey],
      chainId: 1043,
    },
  },
};