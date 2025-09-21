<<<<<<< HEAD
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";


contract UniversityTokenVault is ERC20, Ownable, Pausable {
    uint256 public immutable expiryTime; // Fixed expiry timestamp

    struct BurnRequest {
        address org;
        uint256 amount;
        bool approved;
        bool executed;
    }

    mapping(uint256 => BurnRequest) public burnRequests;
    uint256 public burnRequestCount;

    event Minted(address indexed to, uint256 amount);
    event BurnRequestCreated(uint256 indexed requestId, address indexed org, uint256 amount);
    event BurnRequestApproved(uint256 indexed requestId);
    event BurnRequestExecuted(uint256 indexed requestId, address indexed org, uint256 amount);
    event ExpiredTokensBurned(address indexed org, uint256 amount);

    modifier notExpired() {
        require(block.timestamp <= expiryTime, "Token expired");
        _;
    }

    constructor(
        address admin,
        string memory name_,
        string memory symbol_,
        uint256 expiryDuration
    ) ERC20(name_, symbol_) Ownable(admin) {
        expiryTime = block.timestamp + expiryDuration;
    }


    function mintTo(address to, uint256 amount) external onlyOwner notExpired {
        _mint(to, amount * 10 ** decimals());
        emit Minted(to, amount);
    }


    function createBurnRequest(uint256 amount) external notExpired returns (uint256) {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        burnRequestCount++;
        burnRequests[burnRequestCount] = BurnRequest({
            org: msg.sender,
            amount: amount,
            approved: false,
            executed: false
        });
        emit BurnRequestCreated(burnRequestCount, msg.sender, amount);
        return burnRequestCount;
    }

    function approveBurnRequest(uint256 requestId) external onlyOwner notExpired {
        BurnRequest storage req = burnRequests[requestId];
        require(!req.approved, "Already approved");
        req.approved = true;
        emit BurnRequestApproved(requestId);
    }

    function executeBurnRequest(uint256 requestId) external notExpired {
        BurnRequest storage req = burnRequests[requestId];
        require(req.org == msg.sender, "Not your request");
        require(req.approved, "Not approved");
        require(!req.executed, "Already executed");
        require(balanceOf(req.org) >= req.amount, "Insufficient balance");

        req.executed = true;
        _burn(req.org, req.amount);
        emit BurnRequestExecuted(requestId, req.org, req.amount);
    }


    function forceBurnExpired(address org) external onlyOwner {
        require(block.timestamp > expiryTime, "Not expired yet");
        uint256 orgBalance = balanceOf(org);
        require(orgBalance > 0, "No tokens to burn");
        _burn(org, orgBalance);
        emit ExpiredTokensBurned(org, orgBalance);
    }


    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }
}
=======
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";


contract UniversityTokenVault is ERC20, Ownable, Pausable {
    uint256 public immutable expiryTime; // Fixed expiry timestamp

    struct BurnRequest {
        address org;
        uint256 amount;
        bool approved;
        bool executed;
    }

    mapping(uint256 => BurnRequest) public burnRequests;
    uint256 public burnRequestCount;

    event Minted(address indexed to, uint256 amount);
    event BurnRequestCreated(uint256 indexed requestId, address indexed org, uint256 amount);
    event BurnRequestApproved(uint256 indexed requestId);
    event BurnRequestExecuted(uint256 indexed requestId, address indexed org, uint256 amount);
    event ExpiredTokensBurned(address indexed org, uint256 amount);

    modifier notExpired() {
        require(block.timestamp <= expiryTime, "Token expired");
        _;
    }

    constructor(
        address admin,
        string memory name_,
        string memory symbol_,
        uint256 expiryDuration
    ) ERC20(name_, symbol_) Ownable(admin) {
        expiryTime = block.timestamp + expiryDuration;
    }


    function mintTo(address to, uint256 amount) external onlyOwner notExpired {
        _mint(to, amount * 10 ** decimals());
        emit Minted(to, amount);
    }


    function createBurnRequest(uint256 amount) external notExpired returns (uint256) {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        burnRequestCount++;
        burnRequests[burnRequestCount] = BurnRequest({
            org: msg.sender,
            amount: amount,
            approved: false,
            executed: false
        });
        emit BurnRequestCreated(burnRequestCount, msg.sender, amount);
        return burnRequestCount;
    }

    function approveBurnRequest(uint256 requestId) external onlyOwner notExpired {
        BurnRequest storage req = burnRequests[requestId];
        require(!req.approved, "Already approved");
        req.approved = true;
        emit BurnRequestApproved(requestId);
    }

    function executeBurnRequest(uint256 requestId) external notExpired {
        BurnRequest storage req = burnRequests[requestId];
        require(req.org == msg.sender, "Not your request");
        require(req.approved, "Not approved");
        require(!req.executed, "Already executed");
        require(balanceOf(req.org) >= req.amount, "Insufficient balance");

        req.executed = true;
        _burn(req.org, req.amount);
        emit BurnRequestExecuted(requestId, req.org, req.amount);
    }


    function forceBurnExpired(address org) external onlyOwner {
        require(block.timestamp > expiryTime, "Not expired yet");
        uint256 orgBalance = balanceOf(org);
        require(orgBalance > 0, "No tokens to burn");
        _burn(org, orgBalance);
        emit ExpiredTokensBurned(org, orgBalance);
    }


    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }
}
>>>>>>> d264a367572cc71f1d4e7d77e51964d9aef086e2
