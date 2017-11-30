pragma solidity ^0.4.18;

import "./base/Ledger.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Savings Account
  * @author Compound
  * @notice A Savings account allows functions for customer deposits and withdrawals.
  */
contract Savings is Owned, Ledger {

	/**
      * @notice `customerDdeposit` deposits a given asset in the vault.
      * @param asset Asset to deposit
      * @param from The account to pull asset from
      * @param amount The amount of asset to deposit
      */
    function customerDeposit(address asset, uint256 amount, address from) public {
        // TODO: Should we verify that from matches `msg.sender` or `msg.originator`?

        // Transfer ourselves the asset from `from`
        if (!Token(asset).transferFrom(from, address(this), amount)) {
            return revert();
        }
        accrueInterestAndSaveCheckpoint(LedgerAccount.Deposit, from, asset);

        debit(LedgerAction.CustomerDeposit, LedgerAccount.Cash, from, asset, amount);
        credit(LedgerAction.CustomerDeposit, LedgerAccount.Deposit, from, asset, amount);
    }

    /**
      * @notice `withdraw` withdraws a given amount from an account's balance.
      * @param asset Asset type to withdraw
      * @param amount amount to withdraw
      */
    function customerWithdraw(address asset, uint256 amount, address to) public {
        uint256 balance = accrueInterestAndSaveCheckpoint(msg.sender, asset);
        assert(amount <= balance);

        debit(LedgerAction.CustomerWithdrawal, LedgerAccount.Deposit, from, asset, amount);
        credit(LedgerAction.CustomerWithdrawal, LedgerAccount.Cash, from, asset, amount);

        // Transfer asset out to `to` address
        if (!Token(asset).transfer(to, amount)) {
            revert();
        }
    }
}