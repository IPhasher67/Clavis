// scripts/deploy.js

const hre = require("hardhat");

async function main() {
  console.log("Preparing deployment...\n");

  // --- Configuration ---
  // Define the parameters for your token deployment here.
  // This makes it easy to deploy different tokens for different events.

  const eventName = "University Annual Fest 2025";
  const eventSymbol = "UAF25";
  
  // Fetch the deployer account from Hardhat's environment
  const [deployer] = await hre.ethers.getSigners();
  const initialOwnerAddress = deployer.address; // The deployer will be the initial owner.

  console.log("----------------------------------------------------");
  console.log(`Deploying ProjectVoucherToken for: "${eventName}"`);
  console.log(`Token Symbol: "${eventSymbol}"`);
  console.log(`Deployer and Initial Owner: ${initialOwnerAddress}`);
  console.log("----------------------------------------------------\n");

  // Get the ContractFactory for ProjectVoucherToken
  const ProjectVoucherToken = await hre.ethers.getContractFactory("ProjectVoucherToken");

  // Deploy the contract with the constructor arguments
  const projectVoucherToken = await ProjectVoucherToken.deploy(
    initialOwnerAddress,
    eventName,
    eventSymbol
  );

  // Wait for the deployment transaction to be mined and confirmed
  await projectVoucherToken.waitForDeployment();
  
  const contractAddress = await projectVoucherToken.getAddress();

  console.log("✅ Contract deployment successful!");
  console.log(`ProjectVoucherToken for "${eventName}" deployed to: ${contractAddress}`);
  console.log(`Transaction Hash: ${projectVoucherToken.deploymentTransaction().hash}`);

  console.log("\nDeployment details have been logged. You can now interact with the contract.");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });
