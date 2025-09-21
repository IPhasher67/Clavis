const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// Deploys contracts/FinalVault.sol:UniversityTokenVault
// Constructor: (address initialOwner, string name_, string symbol_)
module.exports = buildModule("FinalVaultModule", (m) => {
  const owner = m.getAccount(0);

  const name = m.getParameter("name", "University Token Vault");
  const symbol = m.getParameter("symbol", "UTV");

  // Use fully-qualified name because another contract has the same contract name
  const vault = m.contract(
    "contracts/FinalVault.sol:UniversityTokenVault",
    [owner, name, symbol]
  );

  return { vault };
});
