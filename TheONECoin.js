// SPDX-License-Identifier: MIT

/**
 Kevin Baum presents: #ONE

 by @KevinBaum

 Community: @TheONECoin
 Website: https://theonecoin.co/
 */

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MarketRegulator.sol";

library Address {
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }
}

contract ONE is ERC20, Ownable {
    using Address for address payable;

    IRouter public router;
    address public pair;
    MarketRegulator public marketRegulator;

    bool private swapping;
    bool public swapEnabled = true;
    bool public claimEnabled;
    
    ONEDividendTracker public dividendTracker;

    address public treasuryWallet = 0x73fA5dDF2aB78D92bB723D92Ab98aF7A0A4Fde8F;
    address public devWallet = 0x16023072c6a88555736B654629fC807d623617A5;

    uint256 public swapTokensAtAmount = 500_000 * 10**18;

    struct Taxes {
        uint256 rewards;
        uint256 treasury;
        uint256 liquidity;
        uint256 dev;
    }

    Taxes public buyTaxes = Taxes(0, 0, 0, 2);
    Taxes public sellTaxes = Taxes(5, 10, 3, 2);

    uint256 public totalBuyTax = 2;
    uint256 public totalSellTax = 20;

    mapping(address => bool) public automatedMarketMakerPairs;

    event SetAutomatedMarketMakerPair(address indexed pair, bool indexed value);
    event SendDividends(uint256 tokensSwapped, uint256 amount);
    event ProcessedDividendTracker(uint256 iterations, uint256 claims, uint256 lastProcessedIndex, bool indexed automatic, uint256 gas, address indexed processor);

    constructor(address regulator) ERC20("ONE", "ONE") {
        marketRegulator = MarketRegulator(regulator);

        dividendTracker = new ONEDividendTracker();

        IRouter _router = IRouter(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        address _pair = IFactory(_router.factory()).createPair(address(this), _router.WETH());

        router = _router;
        pair = _pair;

        _setAutomatedMarketMakerPair(_pair, true);
        dividendTracker.updateLP_Token(_pair);

        dividendTracker.excludeFromDividends(address(dividendTracker), true);
        dividendTracker.excludeFromDividends(address(this), true);
        dividendTracker.excludeFromDividends(owner(), true);
        dividendTracker.excludeFromDividends(address(0xdead), true);
        dividendTracker.excludeFromDividends(address(_router), true);

        excludeFromFees(owner(), true);
        excludeFromFees(address(this), true);
        excludeFromFees(treasuryWallet, true);
        excludeFromFees(devWallet, true);

        _mint(owner(), 10e9 * (10**18));
    }

    receive() external payable {}

    function updateDividendTracker(address newAddress) public onlyOwner {
        ONEDividendTracker newDividendTracker = ONEDividendTracker(payable(newAddress));

        newDividendTracker.excludeFromDividends(address(newDividendTracker), true);
        newDividendTracker.excludeFromDividends(address(this), true);
        newDividendTracker.excludeFromDividends(owner(), true);
        newDividendTracker.excludeFromDividends(address(router), true);
        dividendTracker = newDividendTracker;
    }

    function claim() external {
        require(claimEnabled, "Claim not enabled");
        dividendTracker.processAccount(payable(msg.sender));
    }

    function rescueETH20Tokens(address tokenAddress) external onlyOwner {
        IERC20(tokenAddress).transfer(owner(), IERC20(tokenAddress).balanceOf(address(this)));
    }

    function forceSend() external {
        uint256 ETHbalance = address(this).balance;
        payable(treasuryWallet).sendValue(ETHbalance);
    }

    function trackerRescueETH20Tokens(address tokenAddress) external onlyOwner {
        dividendTracker.trackerRescueETH20Tokens(owner(), tokenAddress);
    }

    function trackerForceSend() external onlyOwner {
        dividendTracker.trackerForceSend(owner());
    }

    function updateRouter(address newRouter) external onlyOwner {
        router = IRouter(newRouter);
    }

    function excludeFromFees(address account, bool excluded) public onlyOwner {
        marketRegulator.setExcludedFromFees(account, excluded);
    }

    function excludeMultipleAccountsFromFees(address[] calldata accounts, bool excluded) public onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            marketRegulator.setExcludedFromFees(accounts[i], excluded);
        }
    }

    function excludeFromDividends(address account, bool value) external onlyOwner {
        dividendTracker.excludeFromDividends(account, value);
    }

    function setTreasuryWallet(address newWallet) external onlyOwner {
        treasuryWallet = newWallet;
    }

    function setDevWallet(address newWallet) external onlyOwner {
        devWallet = newWallet;
    }

    function setSwapTokensAtAmount(uint256 amount) external onlyOwner {
        swapTokensAtAmount = amount * 10**18;
    }

    function setBuyTaxes(uint256 _rewards, uint256 _treasury, uint256 _liquidity, uint256 _dev) external onlyOwner {
        require(_rewards + _treasury + _liquidity + _dev <= 20, "Fee must be <= 20%");
        buyTaxes = Taxes(_rewards, _treasury, _liquidity, _dev);
        totalBuyTax = _rewards + _treasury + _liquidity + _dev;
    }

    function setSellTaxes(uint256 _rewards, uint256 _treasury, uint256 _liquidity, uint256 _dev) external onlyOwner {
        require(_rewards + _treasury + _liquidity + _dev <= 20, "Fee must be <= 20%");
        sellTaxes = Taxes(_rewards, _treasury, _liquidity, _dev);
        totalSellTax = _rewards + _treasury + _liquidity + _dev;
    }

    function setMaxBuyAndSell(uint256 maxBuy, uint256 maxSell) external onlyOwner {
        marketRegulator.setMaxBuyAmount(maxBuy);
        marketRegulator.setMaxSellAmount(maxSell);
    }

    function setSwapEnabled(bool _enabled) external onlyOwner {
        swapEnabled = _enabled;
    }

    function activateTrading() external onlyOwner {
        require(!marketRegulator.tradingEnabled(), "Trading already enabled");
        marketRegulator.setTradingEnabled(true);
    }

    function setClaimEnabled(bool state) external onlyOwner {
        claimEnabled = state;
    }

    function setBot(address bot, bool value) external onlyOwner {
        marketRegulator.setBotStatus(bot, value);
    }

    function setBulkBot(address[] memory bots, bool value) external onlyOwner {
        for (uint256 i = 0; i < bots.length; i++) {
            marketRegulator.setBotStatus(bots[i], value);
        }
    }

    function setLP_Token(address _lpToken) external onlyOwner {
        dividendTracker.updateLP_Token(_lpToken);
    }

    function setAutomatedMarketMakerPair(address newPair, bool value) external onlyOwner {
        _setAutomatedMarketMakerPair(newPair, value);
    }

    function _setAutomatedMarketMakerPair(address newPair, bool value) private {
        require(automatedMarketMakerPairs[newPair] != value, "ONE: Automated market maker pair is already set to that value");
        automatedMarketMakerPairs[newPair] = value;

        if (value) {
            dividendTracker.excludeFromDividends(newPair, true);
        }

        emit SetAutomatedMarketMakerPair(newPair, value);
    }

    function getTotalDividendsDistributed() external view returns (uint256) {
        return dividendTracker.totalDividendsDistributed();
    }

    function isExcludedFromFees(address account) public view returns (bool) {
        return marketRegulator.isExcludedFromFees(account);
    }

    function withdrawableDividendOf(address account) public view returns (uint256) {
        return dividendTracker.withdrawableDividendOf(account);
    }

    function dividendTokenBalanceOf(address account) public view returns (uint256) {
        return dividendTracker.balanceOf(account);
    }

    function getAccountInfo(address account) external view returns (address, uint256, uint256, uint256, uint256) {
        return dividendTracker.getAccount(account);
    }

    function airdropTokens(address[] memory accounts, uint256[] memory amounts) external onlyOwner {
        require(accounts.length == amounts.length, "Arrays must have same size");
        for (uint256 i = 0; i < accounts.length; i++) {
            super._transfer(msg.sender, accounts[i], amounts[i]);
        }
    }

    function _transfer(address from, address to, uint256 amount) internal override {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        if (!marketRegulator.isExcludedFromFees(from) && !marketRegulator.isExcludedFromFees(to) && !swapping) {
            require(marketRegulator.tradingEnabled(), "Trading not active");
            require(!marketRegulator.isBot(from) && !marketRegulator.isBot(to), "Bye Bye Bot");
            if (automatedMarketMakerPairs[to]) require(amount <= marketRegulator.maxSellAmount(), "You are exceeding maxSellAmount");
            else if (automatedMarketMakerPairs[from]) require(amount <= marketRegulator.maxBuyAmount(), "You are exceeding maxBuyAmount");
        }

        if (amount == 0) {
            super._transfer(from, to, 0);
            return;
        }

        uint256 contractTokenBalance = balanceOf(address(this));
        bool canSwap = contractTokenBalance >= swapTokensAtAmount;

        if (canSwap && !swapping && swapEnabled && automatedMarketMakerPairs[to] && !marketRegulator.isExcludedFromFees(from) && !marketRegulator.isExcludedFromFees(to)) {
            swapping = true;

            if (totalSellTax > 0) {
                swapAndLiquify(swapTokensAtAmount);
            }

            swapping = false;
        }

        bool takeFee = !swapping;

        if (marketRegulator.isExcludedFromFees(from) || marketRegulator.isExcludedFromFees(to)) {
            takeFee = false;
        }

        if (!automatedMarketMakerPairs[to] && !automatedMarketMakerPairs[from]) takeFee = false;

        if (takeFee) {
            uint256 feeAmt;
            if (automatedMarketMakerPairs[to]) feeAmt = amount * totalSellTax / 100;
            else if (automatedMarketMakerPairs[from]) feeAmt = amount * totalBuyTax / 100;

            amount = amount - feeAmt;
            super._transfer(from, address(this), feeAmt);
        }
        super._transfer(from, to, amount);

        try dividendTracker.setBalance(from, balanceOf(from)) {} catch {}
        try dividendTracker.setBalance(to, balanceOf(to)) {} catch {}
    }

    function swapAndLiquify(uint256 tokens) private {
        uint256 tokensToAddLiquidityWith = tokens / 2;
        uint256 toSwap = tokens - tokensToAddLiquidityWith;

        uint256 initialBalance = address(this).balance;

        swapTokensForETH(toSwap);

        uint256 ETHToAddLiquidityWith = address(this).balance - initialBalance;

        if (ETHToAddLiquidityWith > 0) {
            addLiquidity(tokensToAddLiquidityWith, ETHToAddLiquidityWith);
        }

        uint256 lpBalance = IERC20(pair).balanceOf(address(this));
        uint256 totalTax = (totalSellTax - sellTaxes.liquidity);

        uint256 treasuryAmt = lpBalance * sellTaxes.treasury / totalTax;
        if (treasuryAmt > 0) {
            IERC20(pair).transfer(treasuryWallet, treasuryAmt);
        }

        uint256 devAmt = lpBalance * sellTaxes.dev / totalTax;
        if (devAmt > 0) {
            IERC20(pair).transfer(devWallet, devAmt);
        }

        uint256 dividends = lpBalance * sellTaxes.rewards / totalTax;
        if (dividends > 0) {
            bool success = IERC20(pair).transfer(address(dividendTracker), dividends);
            if (success) {
                dividendTracker.distributeLPDividends(dividends);
                emit SendDividends(tokens, dividends);
            }
        }
    }

    function swapTokensForETH(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = router.WETH();

        _approve(address(this), address(router), tokenAmount);

        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        _approve(address(this), address(router), tokenAmount);

        router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            address(this),
            block.timestamp
        );
    }
}

contract ONEDividendTracker is Ownable, DividendPayingToken {
    using Address for address payable;

    struct AccountInfo {
        address account;
        uint256 withdrawableDividends;
        uint256 totalDividends;
        uint256 lastClaimTime;
    }

    mapping(address => bool) public excludedFromDividends;
    mapping(address => uint256) public lastClaimTimes;

    event ExcludeFromDividends(address indexed account, bool value);
    event Claim(address indexed account, uint256 amount);

    constructor() DividendPayingToken("ONE_Dividend_Tracker", "ONE_Dividend_Tracker") {}

    function trackerRescueETH20Tokens(address recipient, address tokenAddress) external onlyOwner {
        IERC20(tokenAddress).transfer(recipient, IERC20(tokenAddress).balanceOf(address(this)));
    }

    function trackerForceSend(address recipient) external onlyOwner {
        uint256 ETHbalance = address(this).balance;
        payable(recipient).sendValue(ETHbalance);
    }

    function updateLP_Token(address _lpToken) external onlyOwner {
        LP_Token = _lpToken;
    }

    function _transfer(address, address, uint256) internal pure override {
        require(false, "ONE_Dividend_Tracker: No transfers allowed");
    }

    function excludeFromDividends(address account, bool value) external onlyOwner {
        require(excludedFromDividends[account] != value);
        excludedFromDividends[account] = value;
        if (value == true) {
            _setBalance(account, 0);
        } else {
            _setBalance(account, balanceOf(account));
        }
        emit ExcludeFromDividends(account, value);
    }

    function getAccount(address account) public view returns (address, uint256, uint256, uint256, uint256) {
        AccountInfo memory info;
        info.account = account;
        info.withdrawableDividends = withdrawableDividendOf(account);
        info.totalDividends = accumulativeDividendOf(account);
        info.lastClaimTime = lastClaimTimes[account];
        return (
            info.account,
            info.withdrawableDividends,
            info.totalDividends,
            info.lastClaimTime,
            totalDividendsWithdrawn
        );
    }

    function setBalance(address account, uint256 newBalance) external onlyOwner {
        if (excludedFromDividends[account]) {
            return;
        }
        _setBalance(account, newBalance);
    }

    function processAccount(address payable account) external onlyOwner returns (bool) {
        uint256 amount = _withdrawDividendOfUser(account);

        if (amount > 0) {
            lastClaimTimes[account] = block.timestamp;
            emit Claim(account, amount);
            return true;
        }
        return false;
    }
}

interface IRouter {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

interface IFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

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
