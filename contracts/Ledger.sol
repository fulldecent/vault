pragma solidity ^0.4.18;

import "./base/Token.sol";
import "./base/Owned.sol";
import "./Interest.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Owned, Interest {
    enum LedgerType { Debit, Credit }
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
        uint8   ledgerType,    // Credit or Debit
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
      * @return final balance if applicable
      */
    function debit(LedgerAction ledgerAction, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal returns (uint256) {
        uint256 finalBalance;

        if (isBalanceAccount(ledgerAccount)) {
            finalBalance = debitBalance(
                customer,
                ledgerAction,
                ledgerAccount,
                asset,
                amount);
        }

        // Debit Entry
        LedgerEntry({
            ledgerAction: uint8(ledgerAction),
            ledgerType: uint8(LedgerType.Debit),
            ledgerAccount: uint8(ledgerAccount),
            customer: customer,
            asset: asset,
            amount: amount,
            finalBalance: finalBalance
        });

        return finalBalance;
    }

    /**
      * @notice Credit a ledger account.
      * @param ledgerAction What caused this credit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this credit
      * @param asset The asset which is being credited
      * @param amount The amount to credit
      * @return final balance if applicable
      */
    function credit(LedgerAction ledgerAction, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal returns (uint256) {
        uint256 finalBalance;

        if (isBalanceAccount(ledgerAccount)) {
            finalBalance = creditBalance(
                customer,
                ledgerAction,
                ledgerAccount,
                asset,
                amount);
        }

        // Credit Entry
        LedgerEntry({
            ledgerAction: uint8(ledgerAction),
            ledgerType: uint8(LedgerType.Credit),
            ledgerAccount: uint8(ledgerAccount),
            customer: customer,
            asset: asset,
            amount: amount,
            finalBalance: finalBalance
        });

        return finalBalance;
    }

    function debitBalance(address customer, LedgerAction ledgerAction, LedgerAccount ledgerAccount, address asset, uint256 amount) private returns (uint256) {
        uint256 delta;
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];

        if (ledgerAction == LedgerAction.Interest) {
          checkpoint.timestamp = now;
        } else if (checkpoint.timestamp != now) {
            // We always need to accrue interest before updating balance!
            revert();
        }

        if (ledgerAccount == LedgerAccount.Loan) {
            // TODO: Adjust interest rate to weighted average for additional principal
            uint64 newRate = 0;
            checkpoint.interestRateBPS = newRate;
        }

        checkpoint.balance -= amount;

        return checkpoint.balance;
    }

    function creditBalance(address customer, LedgerAction ledgerAction, LedgerAccount ledgerAccount, address asset, uint256 amount) private returns (uint256) {
        uint256 delta;
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];

        if (ledgerAction == LedgerAction.Interest) {
          checkpoint.timestamp = now;
        } else if (checkpoint.timestamp != now) {
            // We always need to accrue interest before updating balance!
            revert();
        }

        if (ledgerAccount == LedgerAccount.Loan) {
            // TODO: Adjust interest rate to weighted average for additional principal
            uint64 newRate = 0;
            checkpoint.interestRateBPS = newRate;
        }

        checkpoint.balance += amount;

        return checkpoint.balance;
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

        if (interest == 0) {
            checkpoint.timestamp = now; // we're up to date

            return checkpoint.balance;
        } else {
            if (ledgerAccount == LedgerAccount.Deposit) {
                debit(LedgerAction.Interest, LedgerAccount.InterestExpense, customer, asset, interest);
                return credit(LedgerAction.Interest, LedgerAccount.Deposit, customer, asset, interest);
            } else if (ledgerAccount == LedgerAccount.Loan) {
                credit(LedgerAction.Interest, LedgerAccount.InterestIncome, customer, asset, interest);
                return debit(LedgerAction.Interest, LedgerAccount.Loan, customer, asset, interest);
            }

            // Should never happen
            revert();
        }
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
