// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SuperbToken.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Calculette
 * @author Raphael
 * @notice This smart contract allows to do arithmetic operations.
 * To achieve this service you must own and spend the ERC20 SuperbToken,
 * these tokens can be buy through the ICO contracts.
 *
 * By spending tokens in this contracts you receive credits to do operations,
 * the rate of credits for 1 token is fixed at the deployment of the smart contract.
 * */

contract Calculette is Ownable {
    using Address for address payable;

    SuperbToken private _token;
    mapping(address => uint256) private _credits;
    uint256 private _rate;

    event CreditsBought(address indexed buyers, uint256 creditsBought);
    event Add(int256 result, int256 number1, int256 number2);
    event Sub(int256 result, int256 number1, int256 number2);
    event Mul(int256 result, int256 number1, int256 number2);
    event Mod(int256 result, int256 number1, int256 number2);
    event Div(int256 result, int256 number1, int256 number2);

    /**
     * @notice The rate of number of credits for 1 token is defined at the deployment.
     * @param rate_ correspond to the number of credits for 1 SuperbToken
     * */
    constructor(
        address tokenContractAddress,
        address owner_,
        uint256 rate_
    ) Ownable() {
        _token = SuperbToken(tokenContractAddress);
        transferOwnership(owner_);
        _rate = rate_;
    }

    /**
     * @notice This modifier check if the sender have credits to do the operation,
     * and withdraw one credits for the operation.
     * */
    modifier payCredit() {
        require(_credits[msg.sender] != 0, "Calculette: you have no more credits.");
        _credits[msg.sender] -= 1;
        _;
    }

    /**
     * @notice This function calls a private function. Set for further implementations
     * */
    function buyCredits(uint256 amount) public {
        _buyCredits(amount);
    }

    function add(int256 number1, int256 number2) public payCredit returns (int256) {
        emit Add(number1 + number2, number1, number2);
        return number1 + number2;
    }

    function sub(int256 number1, int256 number2) public payCredit returns (int256) {
        emit Sub(number1 - number2, number1, number2);
        return number1 - number2;
    }

    function mul(int256 number1, int256 number2) public payCredit returns (int256) {
        emit Mul(number1 * number2, number1, number2);
        return number1 * number2;
    }

    function mod(int256 number1, int256 number2) public payCredit returns (int256) {
        emit Mod(number1 % number2, number1, number2);
        return number1 % number2;
    }

    function div(int256 number1, int256 number2) public payCredit returns (int256) {
        require(number2 != 0, "Calculette: you cannot divide by zero.");
        emit Div(number1 / number2, number1, number2);
        return number1 / number2;
    }

    function tokenContract() public view returns (address) {
        return address(_token);
    }

    function rate() public view returns (uint256) {
        return _rate;
    }

    function creditsBalanceOf(address account) public view returns (uint256) {
        return _credits[account];
    }

    /**
     * @notice This function works only if:
     *   - sender have approved the contract for the ERC20
     *   - sender have credits
     *
     * @param amount correspond to the amount of token send to buy credits
     * */
    function _buyCredits(uint256 amount) private {
        require(
            _token.allowance(msg.sender, address(this)) >= amount,
            "Calculette: you must approve the contract before use it."
        );
        _token.transferFrom(msg.sender, owner(), amount);
        _credits[msg.sender] += amount * _rate;
        emit CreditsBought(msg.sender, amount * _rate);
    }
}
