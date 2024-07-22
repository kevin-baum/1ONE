
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract DividendPayingToken is ERC20, Ownable {
    uint256 public totalDividendsWithdrawn;
    address public LP_Token;

    function distributeLPDividends(uint256 amount) external virtual;

    function totalDividendsDistributed() external view virtual returns (uint256);

    function withdrawableDividendOf(address account) public view virtual returns (uint256);

    function accumulativeDividendOf(address account) public view virtual returns (uint256);

    function _withdrawDividendOfUser(address payable account) internal virtual returns (uint256);

    function _setBalance(address account, uint256 newBalance) internal virtual;
}
