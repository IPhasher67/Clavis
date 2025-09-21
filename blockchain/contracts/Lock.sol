// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ProjectVoucherToken
 * @author AuraDAO (Based on DevJams Project Plan)
 * @notice This is the core utility and accounting token for the AuraDAO ecosystem.
 * @dev It is an ERC20 token with pausable and ownable functionalities.
 * The token is designed to be a stable, non-speculative voucher representing a 1:1
 * peg with a fiat currency for project fund management. Its lifecycle is strictly
 * controlled: minted by a central Treasury/Admin and burned upon verified expense redemption.
 */
contract ProjectVoucherToken is ERC20, Ownable, Pausable {
    
    /**
     * @notice The constructor initializes the token with a name and symbol.
     * @param initialOwner The address that will have ownership of the contract.
     * This should be the address of the Treasury contract or the main Organization Admin.
     * @param name_ The name of the token (e.g., "University Fest 2025 Voucher").
     * @param symbol_ The symbol of the token (e.g., "UFV25").
     */
    constructor(
        address initialOwner,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) Ownable(initialOwner) {}

    /**
     * @notice Pauses all token transfers.
     * @dev Can only be called by the contract owner. This is a critical safety
     * feature to halt activity in case of a detected vulnerability or emergency.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @notice Resumes token transfers after they have been paused.
     * @dev Can only be called by the contract owner.
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    // Snapshot functionality removed for OpenZeppelin v5 compatibility.
    // Consider using Checkpoints library or ERC20Votes if you need historical tracking.

    /**
     * @notice Mints new tokens and assigns them to a specified account.
     * @dev This function is restricted to the owner (Treasury/Admin). It's the
     * sole entry point for new tokens into the ecosystem, representing the
     * conversion of fiat donations/funds into on-chain vouchers.
     * @param to The address to which the new tokens will be minted.
     * @param amount The amount of tokens to mint (in wei, i.e., with 18 decimals).
     */
    function mintTo(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Redeems (burns) a specified amount of tokens from the caller's account.
     * @dev This function is intended to be called by a verified small organizer
     * or a secure backend worker acting on their behalf after an expense claim
     * has been approved off-chain. Burning the token completes its lifecycle.
     * @param amount The amount of tokens to redeem and burn.
     */
    function redeemForExpense(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Overrides the internal token transfer functions to ensure they respect
     * the `Pausable` state and to update snapshots correctly.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20)
        whenNotPaused
    {
        super._update(from, to, value);
    }
}
