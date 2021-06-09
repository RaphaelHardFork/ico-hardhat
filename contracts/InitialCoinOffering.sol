// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SuperbToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title Contract details
 * @author Raphael
 * @notice This contract is deployed with an ERC20 contract in order to set up a sale,
 * the sale last 2 weeks since the owner call the function startSalePeriod(). The ICO is unique,
 * the owner cannot set up a new ICO without re deploy the contract.
 *
 * Tokens and Ether are blocked in the contract during these 2 weeks.
 * */
contract InitialCoinOffering is Ownable {
    using Address for address payable;

    SuperbToken private _token;
    uint256 private _supplyInSale;
    uint256 private _supplySold;
    uint256 private _rate;
    mapping(address => uint256) private _tokenBalances;
    uint256 private _startTimeEpoch;

    /**
     * @param owner address of the owner
     * @param icoContract address of the ERC20 token contract
     * @param supplyInSale amount of token to put in sale
     * @param rate amount of token for one ether
     * */
    event SaleStarted(address indexed owner, address indexed icoContract, uint256 supplyInSale, uint256 rate);

    /**
     * @param buyer address who bought tokens
     * @param amount amount of token bought
     * @param totalSupplyBought total amount bought so far
     * */
    event TokenBought(address indexed buyer, uint256 amount, uint256 totalSupplyBought);

    /**
     * @param buyer address who claims tokens
     * @param amount amount of tokens claimed
     * */
    event TokenClaimed(address indexed buyer, uint256 amount);

    /**
     * @dev The constructor set the ERC20 contract address and the owner (Ownable.sol) of the ICO
     * @param superbTokenAddress is the deployed contract address of the ERC20 token
     * @param owner_ is the owner of the ICO contract, set via the Ownable contract
     * */
    constructor(address superbTokenAddress, address owner_) Ownable() {
        _token = SuperbToken(superbTokenAddress);
        transferOwnership(owner_);
    }

    /**
     * @notice This modifier is used in the _buyToken() function to prevent a purchase if it is out of the sale period.
     * */
    modifier isSalePeriod() {
        require(_startTimeEpoch != 0, "InitialCoinOffering: the sale is not started yet.");
        if (_startTimeEpoch != 0) {
            require(block.timestamp < _startTimeEpoch + 2 weeks, "InitialCoinOffering: The sale is over.");
        }
        _;
    }

    /**
     * @notice buyers can throw directly on the contract address to buy tokens.
     * @dev this function call the private _buyToken() function
     * */
    receive() external payable {
        _buyToken(msg.sender, msg.value);
    }

    /**
     * @notice This payable function is used to buy token via the ICO contract.
     * As the receive function, it calls the private function _buyToken().
     * */
    function buyToken() public payable {
        _buyToken(msg.sender, msg.value);
    }

    /**
     * @notice This function is called to initiate the sale, this function is callable
     * only by the owner and only if:
     *     - the owner sell less or equal than the total supply
     *     - the owner have already allowed the smart contract for spend funds
     *     - the sale is not already started for the first time
     *
     * The owner have to deploy another contract if he wants to achieve a second ICO.
     *
     * @param supplyInSale_ is the amount of the supply the owner wants to sell through the ICO
     * @param rate_ the number correspond the number of token for 1 ether
     * [1 => 1 token = 1 ether]
     * [1 000  => 1000 token = 1 ether]
     * [1 000  => 1 token = 1 finney]
     * [456  => 456 token = 1 ether]
     * */
    function startSalePeriod(uint256 supplyInSale_, uint256 rate_) public onlyOwner {
        require(
            supplyInSale_ <= _token.totalSupply(),
            "InitialCoinOffering: you cannot sell more than the total supply."
        );
        require(
            supplyInSale_ <= _token.allowance(owner(), address(this)),
            "InitialCoinOffering: you have not allowed the funds yet."
        );
        require(_startTimeEpoch == 0, "InitialCoinOffering: the sale is already launched.");
        _startTimeEpoch = block.timestamp;
        _supplyInSale = supplyInSale_;
        _rate = rate_;
        emit SaleStarted(owner(), address(this), supplyInSale_, rate_);
    }

    /**
     * @notice This function is called to get tokens once the ICO is over.
     *
     * @dev in this function the ICO contract send tokens directly to the buyer,
     * since tokens where moved to the contract in the buyToken() function.
     * */
    function claimToken() public {
        require(
            block.timestamp > _startTimeEpoch + 2 weeks,
            "InitialCoinOffering: you cannot claim tokens before the sale ends."
        );
        require(_tokenBalances[msg.sender] != 0, "InitialCoinOffering: You have nothing to claim.");
        uint256 amount = _tokenBalances[msg.sender];
        _tokenBalances[msg.sender] = 0;
        _token.transfer(msg.sender, amount);
        emit TokenClaimed(msg.sender, amount);
    }

    /**
     * @notice This function is set for the owner in order to withdraw ether generated by the sale,
     * the owner cannot withdraw ethers before the sale end (may be removed).
     *
     * May it needs a Reentrancy Guard ?
     * */
    function withdrawSaleProfit() public onlyOwner {
        require(address(this).balance != 0, "InitialCoinOffering: there is no ether to withdraw in the contract.");
        require(
            block.timestamp > _startTimeEpoch + 2 weeks,
            "InitialCoinOffering: you cannot withdraw ether before the sale ends."
        );
        payable(msg.sender).sendValue(address(this).balance);
    }

    /**
     * @return The address of the ERC20 contract
     * */
    function tokenContract() public view returns (address) {
        return address(_token);
    }

    /**
     * @return the number of token for 1 ether
     * */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @return The total amount of token minted at the deployment
     * */
    function supplyInSale() public view returns (uint256) {
        return _supplyInSale;
    }

    /**
     * @return The amount of token selled so far
     * */
    function supplySold() public view returns (uint256) {
        return _supplySold;
    }

    /**
     * @param account address checked for token balance
     * @return the amount of tokens locked in the contract for the specified address
     * */
    function tokenBalanceOf(address account) public view returns (uint256) {
        return _tokenBalances[account];
    }

    /**
     * @return the amount of ethers locked in the contract
     * */
    function contractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @return the time before the sale end: 0 means the sale have not started yet or the sale is over
     * */
    function timeBeforeSaleEnd() public view returns (uint256) {
        if (_startTimeEpoch == 0) {
            return 0;
        } else {
            return (_startTimeEpoch + 2 weeks) - block.timestamp;
        }
    }

    /**
     * @notice This private function is used in the receive() and the buyToken().
     *
     * If the token supply is lower than the amount of the value set by the buyers,
     * this latter is refund and take the remaining supply.
     *
     * When this function is called, several state variable is updated :
     *  - the supply in sale decrease
     *  - the suplly solded increase
     *  - the token balance of the buyers increase
     *
     * @dev The amount of solded token is transferred from the owner address to the contract address,
     * this way the owner cannot transfer fund that is already bought in the ICO.
     * */
    function _buyToken(address sender, uint256 amount) private isSalePeriod {
        require(_supplyInSale != 0, "InitialCoinOffering: there is no more token in sale.");
        uint256 tokenAmount = amount * _rate;
        uint256 exceedTokenAmount;
        if (_supplyInSale < tokenAmount) {
            exceedTokenAmount = tokenAmount - _supplyInSale;
        }
        _supplyInSale -= tokenAmount - exceedTokenAmount;
        _tokenBalances[sender] += tokenAmount - exceedTokenAmount;
        _supplySold += tokenAmount - exceedTokenAmount;
        _token.transferFrom(owner(), address(this), tokenAmount - exceedTokenAmount);
        payable(sender).sendValue(exceedTokenAmount / _rate);
        emit TokenBought(sender, tokenAmount - exceedTokenAmount, _supplySold);
    }
}
