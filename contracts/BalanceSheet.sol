pragma solidity ^0.4.18;

import "./Ledger.sol";

/**
  * @title The Compound Balance Sheet
  * @author Compound
  * @notice The balance sheet keeps track of balances based on credits and debits
  *         to given customer deposit and loan accounts.
  */
contract BalanceSheet is Ledger {

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
    }

    // A map of customer -> LedgerAccount{Deposit, Loan} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    /**
      * @notice Adjusts the balance on a given account
      * @param customer the customer
      * @param ledgerReason which caused this adjustment
      * @param ledgerType credit or debit?
      * @param ledgerAccount which account to adjust
      * @param asset The asset to adjust
      * @param amount The amount to adjust that asset
      */
    function adjustBalance(address customer, LedgerReason ledgerReason, LedgerType ledgerType, LedgerAccount ledgerAccount, address asset, uint256 amount) internal returns (uint256) {
        if (!isBalanceAccount(ledgerAccount)) {
            return 0;
        }

        uint256 delta;

        // Exclusive or to say "Crediting a Deposit account" or "Debiting a Loan account"
        // both increase the balance, while the inverse always decrease the balance.
        bool isPositive = (
            ( ledgerAccount == LedgerAccount.Deposit && ledgerType == LedgerType.Credit ) ||
            ( ledgerAccount == LedgerAccount.Loan && ledgerType == LedgerType.Debit )
        );

        if (isPositive) {
            delta = amount;
        } else {
            delta = 0 - amount;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];

        if (ledgerReason == LedgerReason.Interest) {
          checkpoint.timestamp = now;
        } else if (checkpoint.timestamp != now) {
            // We always need to accrue interest before updating balance!
            revert();
        }

        if (ledgerAccount == LedgerAccount.Loan && delta > 0) {
            // TODO: Adjust interest rate to weighted average for additional principal
            uint64 newRate = 0;
            checkpoint.interestRateBPS = newRate;
        }

        checkpoint.balance += delta;

        return checkpoint.balance;
    }

    /**
      * @notice `isBalanceAccount` indicates if this account is the type that has an associated balance
      * @param ledgerAccount the account type (e.g. Deposit or Loan)
      * @return whether or not this ledger account tracks a balance
      */
    function isBalanceAccount(LedgerAccount ledgerAccount) private returns (bool) {
        return (
            ledgerAccount == LedgerAccount.Loan ||
            ledgerAccount == LedgerAccount.Deposit);
    }
}