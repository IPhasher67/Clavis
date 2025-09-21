// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24; // OpenZeppelin v5 requires >=0.8.20

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract UniversityTokenVault is ERC20, Ownable, Pausable {

    struct BurnRequest {
        address requester;
        uint256 amount;
        bool approved;
        bool executed;
    }


    mapping(uint256 => BurnRequest) public burnRequests;
    uint256 public requestCount;


    event Minted(address indexed to, uint256 amount);
    event BurnRequestCreated(uint256 indexed requestId, address indexed requester, uint256 amount);
    event BurnRequestApproved(uint256 indexed requestId);
    event BurnRequestExecuted(uint256 indexed requestId, address indexed requester, uint256 amount);


    constructor(address initialOwner, string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
        Ownable(initialOwner)
    {}


    function mintTo(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid to");
        require(amount > 0, "Amount must be > 0");
        _mint(to, amount);
        emit Minted(to, amount);
    }


    function pause() external onlyOwner {
        _pause();
    }


    function unpause() external onlyOwner {
        _unpause();
    }


    function _update(address from, address to, uint256 value)
        internal
        override(ERC20)
        whenNotPaused
    {
        super._update(from, to, value);
    }


    function createBurnRequest(uint256 amount) external returns (uint256 requestId) {
        require(amount > 0, "Amount must be > 0");
        requestCount += 1;
        requestId = requestCount;
        burnRequests[requestId] = BurnRequest({
            requester: msg.sender,
            amount: amount,
            approved: false,
            executed: false
        });
        emit BurnRequestCreated(requestId, msg.sender, amount);
    }


    function approveBurnRequest(uint256 requestId) external onlyOwner {
        BurnRequest storage br = burnRequests[requestId];
        require(br.requester != address(0), "Request not found");
        require(!br.approved, "Already approved");
        require(!br.executed, "Already executed");
        br.approved = true;
        emit BurnRequestApproved(requestId);
    }


    function executeBurn(uint256 requestId) external {
        BurnRequest storage br = burnRequests[requestId];
        require(br.requester != address(0), "Request not found");
        require(br.approved, "Not approved");
        require(!br.executed, "Already executed");
        require(balanceOf(br.requester) >= br.amount, "Insufficient balance");

        br.executed = true;
        _burn(br.requester, br.amount);

        emit BurnRequestExecuted(requestId, br.requester, br.amount);
    }


    function getBurnRequest(uint256 requestId)
        external
        view
        returns (address requester, uint256 amount, bool approved, bool executed)
    {
        BurnRequest memory br = burnRequests[requestId];
        return (br.requester, br.amount, br.approved, br.executed);
    }
}
