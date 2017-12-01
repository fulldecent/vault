pragma solidity ^0.4.18;

import "./InterestRate.sol";
import "./BalanceSheet.sol";

/**
  * @title The Compound Interest Bearing Balance Sheet
  * @author Compound
  * @notice This balance sheet allows us to caclulate a ledger that has balances,
  *         interest and ledger entries. It is used by Savings and Loaner.
  */
contract InterestBearingBalanceSheet is InterestRate, BalanceSheet {

    /**
      * @notice `accrueInterestAndSaveCheckpoint` adds interest to your balance since the last
      *         checkpoint and sets the checkpoint to now.
      * @param ledgerAccount the account type (e.g. Deposit or Loan)
      * @param customer the customer
      * @param asset the asset to accrue interest on
      * @return the customer's balance in this asset after accrual
      */
    function accrueInterestAndSaveCheckpoint(LedgerAccount ledgerAccount, address customer, address asset) internal returns (uint256) {
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];

        uint interest = balanceWithInterest(
            checkpoint.balance,
            checkpoint.timestamp,
            now,
            rates[asset]) - checkpoint.balance;

        if (interest == 0) {
            checkpoint.timestamp = now; // Mark that we're up to date (with no interest bourne)

            return checkpoint.balance;
        } else {
            if (ledgerAccount == LedgerAccount.Deposit) {
                // Debit Interest Expense
                debit(LedgerReason.Interest, LedgerAccount.InterestExpense, customer, asset, interest);

                // Credit Deposit and return new balance
                return credit(LedgerReason.Interest, LedgerAccount.Deposit, customer, asset, interest);
            } else if (ledgerAccount == LedgerAccount.Loan) {
                // Debit Interest Income
                credit(LedgerReason.Interest, LedgerAccount.InterestIncome, customer, asset, interest);

                // Credit Deposit and return new balance
                return debit(LedgerReason.Interest, LedgerAccount.Loan, customer, asset, interest);
            }

            // Should never happen since no other account types can bear interest
            revert();
        }
    }
}
