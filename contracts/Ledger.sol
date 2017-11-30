pragma solidity ^0.4.18;

import "./base/Token.sol";
import "./base/Owned.sol";
import "./base/Interesting.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Owned, Interesting {
    enum LedgerAction { CustomerDeposit, CustomerWithdrawal, Interest }
    enum LedgerAccount { Cash, Loan, Deposit, InterestExpense, InterestIncome }

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
    }

    // A map of customer -> LedgerAccount{Deposit, Loan} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    event LedgerEntry(
        uint8   ledgerAction,  // Ledger action
        uint8   ledgerAccount, // Ledger account
        address customer,      // Customer associated with entry
        address asset,         // Asset associated with this entry
        uint256 amount,        // Amount of asset associated with this entry
        uint256 finalBalance); // Ledger account is Deposit or Loan, the new balance

    /**
      * @notice `Ledger` tracks balances for a given customer by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice Debit a ledger account.
      * @param ledgerAction What caused this debit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this debit
      * @param asset The asset which is being debited
      * @param amount The amount to debit
      */
    function debit(LedgerAction ledgerAction, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
        uint256 finalBalance = adjustBalance(
            customer,
            ledgerAccount,
            asset,
            amount,
            ledgerAccount == LedgerAccount.Loan);

        // Debit Entry
        LedgerEntry({
          ledgerAction: uint8(ledgerAction),
          ledgerAccount: uint8(ledgerAccount),
          customer: customer,
          asset: asset,
          amount: amount,
          finalBalance: finalBalance
        });
    }

    /**
      * @notice Credit a ledger account.
      * @param ledgerAction What caused this credit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this credit
      * @param asset The asset which is being credited
      * @param amount The amount to credit
      */
    function credit(LedgerAction ledgerAction, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
        uint256 finalBalance = adjustBalance(
            customer,
            ledgerAccount,
            asset,
            amount,
            ledgerAccount == LedgerAccount.Deposit);

        // Credit Entry
        LedgerEntry({
          ledgerAction: uint8(ledgerAction),
          ledgerAccount: uint8(ledgerAccount),
          customer: customer,
          asset: asset,
          amount: amount,
          finalBalance: finalBalance
        });
    }

    /**
      * @notice Adjusts the balance on a given account
      * @param customer the customer
      * @param ledgerAccount which account to adjust
      * @param asset The asset to adjust
      * @param amount The amount to adjust that asset
      * @param isPositive Should the amount go up or down?
      */
    function adjustBalance(address customer, LedgerAccount ledgerAccount, address asset, uint256 amount, bool isPositive) private returns (uint256) {
        uint256 delta;
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];

        if (checkpoint.timestamp != now) {
            // We always need to accrue interest before updating balance!
            revert();
        }

        if (isPositive) {
            delta = amount;
        } else {
            delta = 0 - amount;
        }

        if (ledgerAccount == LedgerAccount.Loan && isPositive) {
            // TODO: Adjust interest rate to weighted average for additional principal
            uint64 newRate = 0;
            checkpoint.interestRateBPS = newRate;
        }

        checkpoint.balance += delta;
        return checkpoint.balance;
    }

    /**
      * @notice `getBalanceAtLastCheckpoint` returns the balance (without interest) for
      *         the given customer in the given asset (e.g. W-Eth or OMG)
      * @param customer The customer to get the balance of
      * @param asset The address of the asset
      * @return balance The balance (without interest) of the asset in given customer account
      */
    function getBalanceAtLastCheckpoint(LedgerAccount ledgerAccount, address customer, address asset) private returns (uint256) {
        return balanceCheckpoints[customer][uint8(ledgerAccount)][asset].balance;
    }

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

        if (interest > 0) {
            if (ledgerAccount == LedgerAccount.Deposit) {
                debit(LedgerAction.Interest, LedgerAccount.InterestExpense, customer, asset, interest);
                credit(LedgerAction.Interest, LedgerAccount.Deposit, customer, asset, interest);
            } else if (ledgerAccount == LedgerAccount.Loan) {
                debit(LedgerAction.Interest, LedgerAccount.Loan, customer, asset, interest);
                credit(LedgerAction.Interest, LedgerAccount.InterestIncome, customer, asset, interest);
            }
        }

        return getBalanceAtLastCheckpoint(ledgerAccount, customer, asset);
    }
}
