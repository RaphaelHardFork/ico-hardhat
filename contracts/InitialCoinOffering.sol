// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SuperbToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InitialCoinOffering is Ownable {
    SuperbToken private _token;
    uint256 private _supplyInSale;
    mapping(address => uint256) private _tokenBalances;
    //uint256 private _startTimeEpoch;

    event TokenBought(address indexed buyer, uint256 amount);

    constructor(address superbTokenAddress, address owner_) Ownable() {
        _token = SuperbToken(superbTokenAddress);
        _supplyInSale = _token.totalSupply();
        transferOwnership(owner_);
    }

    /*
    modifier AfterSalePeriod() {
        require(block.timestamp > _startTimeEpoch + 2 weeks, "InitialCoinOffering: The sale is not over yet.");
        _;
    }
    */

    function startSalePeriod() public onlyOwner {
        //_startTimeEpoch = block.timestamp;
        _token.approve(address(this), _supplyInSale);
    }

    function buyToken() public payable {
        require(msg.value <= _supplyInSale, "InitialCoinOffering: There is no more token to buy.");
        _supplyInSale -= msg.value;
        _tokenBalances[msg.sender] += msg.value;
        _token.approve(msg.sender, msg.value);
        emit TokenBought(msg.sender, msg.value);
    }

    function claimToken() public {
        require(_tokenBalances[msg.sender] > 0, "InitialCoinOffering: You have nothing to claim.");
        uint256 amount = _tokenBalances[msg.sender];
        _tokenBalances[msg.sender] = 0;
        //address(this).delegatecall(_token.transferFrom(owner(), msg.sender, amount));
        //_token.transferFrom(owner(), msg.sender, amount);
    }

    function tokenContract() public view returns (address) {
        return address(_token);
    }

    function supplyInSale() public view returns (uint256) {
        return _supplyInSale;
    }

    function tokenBalanceOf(address account) public view returns (uint256) {
        return _tokenBalances[account];
    }
}
