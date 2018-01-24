pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./MoneyMarket.sol";
import "./tokens/EtherToken.sol";

/**
  * @title The Compound Smart Wallet
  * @author Compound
  * @notice The Compound Smart Wallet allows customers to easily access
  *         the Compound core contracts.
  */
contract Wallet is Owned {
    MoneyMarket public moneyMarket;
    EtherToken public etherToken;

    event Supply(address acct, address asset, uint256 amount);
    event Withdrawal(address acct, address asset, uint256 amount);
    event Borrow(address acct, address asset, uint256 amount);

    /**
      * @notice Creates a new Wallet.
      * @param moneyMarketAddress Address of Compound MoneyMarket contract
      * @param etherTokenAddress Address of EtherToken contract
      */
    function Wallet(address owner_, address moneyMarketAddress, address etherTokenAddress) public {
        owner = owner_;
        moneyMarket = MoneyMarket(moneyMarketAddress);
        etherToken = EtherToken(etherTokenAddress);
    }

    /**
      * @notice Supplies eth into the Compound MoneyMarket contract
      * @return success or failure
      */
    function supplyEth() public payable returns (bool) {
        // Transfer eth into EtherToken
        // This should only fail if out-of-gas
        etherToken.deposit.value(msg.value)();

        return supplyDirect(address(etherToken), msg.value);
    }

    /**
      * @notice Supplies token into Compound MoneyMarket contract
      * @param asset Address of token
      * @param amount Amount of token to transfer
      * @return success or failure
      */
    function supplyAsset(address asset, uint256 amount) public returns (bool) {
        // First, transfer in to this wallet
        if (!Token(asset).transferFrom(msg.sender, address(this), amount)) {
            failure("Wallet::TokenTransferFailed");
            return false;
        }

        return supplyDirect(asset, amount);
    }

    /**
      * @notice Supplies token into Compound MoneyMarket contract from this Wallet
      * @param asset Address of token (must be owned by this contract)
      * @param amount Amount of token to transfer
      * @return success or failure
      */
    function supplyDirect(address asset, uint256 amount) public returns (bool) {
        // Approve the moneyMarket to pull in this asset
        if (!Token(asset).approve(address(moneyMarket), amount)) {
            failure("Wallet::AssetApproveFailed", uint256(msg.sender), uint256(asset), uint256(amount));
            return false;
        }

        // Supply asset in Compound MoneyMarket contract
        if (!moneyMarket.customerSupply(asset, amount, address(this))) {
            return false;
        }

        // Log this supply
        Supply(msg.sender, asset, amount);

        return true;
    }

    /**
      * @notice Withdraws eth from Compound MoneyMarket contract
      * @param amount Amount to withdraw
      * @param to Address to withdraw to
      * @return success or failure
      */
    function withdrawEth(uint256 amount, address to) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        // Withdraw from Compound MoneyMarket contract to EtherToken
        if (!moneyMarket.customerWithdraw(address(etherToken), amount, address(this))) {
            return false;
        }

        // Now we have EtherTokens, let's withdraw them to Eth
        // Note, this fails with `revert`
        etherToken.withdraw(amount);

        // Now, we should have the ether from the withdraw,
        // let's send that to the `to` address
        if (!to.send(amount)) {
            // TODO: The asset is now stuck in the wallet?
            failure("Wallet::EthTransferFailed", uint256(msg.sender), uint256(to), uint256(amount));
            return false;
        }

        // Log event
        Withdrawal(msg.sender, address(etherToken), amount);

        return true;
    }

    /**
      * @notice Withdraws asset from Compound MoneyMarket contract
      * @param asset Asset to withdraw
      * @param amount Amount to withdraw
      * @param to Address to withdraw to
      * @return success or failure
      */
    function withdrawAsset(address asset, uint256 amount, address to) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        // Withdraw the asset
        if (!moneyMarket.customerWithdraw(asset, amount, to)) {
            return false;
        }

        // Log event
        Withdrawal(msg.sender, asset, amount);

        return true;
    }

    /**
      * @notice Borrows eth from Compound MoneyMarket contract
      * @param amount Amount to borrow
      * @param to Address to withdraw to
      * @return success or failure
      */
    function borrowEth(uint256 amount, address to) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        // Borrow the ether asset
        if (!moneyMarket.customerBorrow(address(etherToken), amount)) {
            return false;
        }

        // Log borrow event
        Borrow(msg.sender, address(etherToken), amount);

        // Now withdraw the ether asset
        return withdrawEth(amount, to);
    }

    /**
      * @notice Borrows asset from Compound MoneyMarket contract
      * @param asset Asset to borrow
      * @param amount Amount to borrow
      * @param to Address to withdraw to
      * @return success or failure
      */
    function borrowAsset(address asset, uint256 amount, address to) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        // Borrow the asset
        if (!moneyMarket.customerBorrow(asset, amount)) {
            return false;
        }

        // Log borrow event
        Borrow(msg.sender, asset, amount);

        // Now withdraw the asset
        return withdrawAsset(asset, amount, to);
    }

    /**
      * @notice Returns the balance of Eth in this wallet via MoneyMarket Contract
      * @return Eth balance from MoneyMarket Contract
      */
    function balanceEth() public view returns (uint256) {
        return balance(address(etherToken));
    }

    /**
      * @notice Returns the balance of given asset in this wallet via MoneyMarket Contract
      * @return Asset balance from MoneyMarket Contract
      */
    function balance(address asset) public view returns (uint256) {
        return moneyMarket.getSupplyBalance(address(this), asset);
    }

    /**
      * @notice Supply Eth into Compound MoneyMarket contract.
      * @dev We allow arbitrary supplys in from `etherToken`
      *      Note: Fallback functions cannot have return values.
      */
    function() public payable {
        if (msg.sender == address(etherToken)) {
            /* This contract unwraps EtherTokens during withdrawals.
             *
             * When we unwrap a token, EtherToken sends this contract
             * the value of the tokens in Ether. We should not treat this
             * as a new supply (!!), and as such, we choose to not call
             * `supplyEth` for Ether transfers from EtherToken.
             */

            return;
        } else {
            supplyEth();
        }
    }
}
