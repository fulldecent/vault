pragma solidity ^0.4.18;

import "./base/Token.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Owned {
    enum LedgerReason {
      CustomerDeposit,
      CustomerWithdrawal,
      Interest,
      CustomerBorrow
    }
    enum LedgerType { Debit, Credit }
    enum LedgerAccount { Cash, Loan, Deposit, InterestExpense, InterestIncome }

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
        uint256 nextPaymentDate;
    }

    // A map of customer -> LedgerAccount{Deposit, Loan} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    function saveCheckpoint(
      address customer,
      LedgerReason ledgerReason,
      LedgerAccount ledgerAccount,
      address asset
    ) {
      BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];
      require(ledgerReason == LedgerReason.Interest ||
              checkpoint.timestamp == now);
      checkpoint.timestamp = now;
    }
    event LedgerEntry(
        LedgerReason    ledgerReason,     // Ledger reason
        LedgerType      ledgerType,       // Credit or Debit
        LedgerAccount   ledgerAccount,    // Ledger account
        address         customer,         // Customer associated with entry
        address         asset,            // Asset associated with this entry
        uint256         amount,           // Amount of asset associated with this entry
        uint256         balance,          // Ledger account is Deposit or Loan, the new balance
        uint64          interestRateBPS,  // Interest rate in basis point if fixed
        uint256         nextPaymentDate); // Nexy payment date if associated with loan


    /**
      * @notice `Ledger` tracks balances for a given customer by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice Debit a ledger account.
      * @param ledgerReason What caused this debit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this debit
      * @param asset The asset which is being debited
      * @param amount The amount to debit
      * @return final balance if applicable
      */
    function debit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal returns (uint256) {
        uint256 finalBalance;

        if(isBalanceAccount(ledgerAccount)) {
          BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];
          if(ledgerAccount == LedgerAccount.Loan) {
            checkpoint.balance += amount;
          } else {
            checkpoint.balance -= amount;
          }
          finalBalance = checkpoint.balance;
        }

        // Debit Entry
        LedgerEntry({
            ledgerReason: ledgerReason,
            ledgerType: LedgerType.Debit,
            ledgerAccount: ledgerAccount,
            customer: customer,
            asset: asset,
            amount: amount,
            balance: finalBalance,
            interestRateBPS: 0,
            nextPaymentDate: 0
        });

        return finalBalance;
    }

    /**
      * @notice Credit a ledger account.
      * @param ledgerReason What caused this credit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this credit
      * @param asset The asset which is being credited
      * @param amount The amount to credit
      * @return final balance if applicable
      */
    function credit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal returns (uint256) {
        uint256 finalBalance;
        if(isBalanceAccount(ledgerAccount)) {
          BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];
          checkpoint.balance += amount;
          finalBalance = checkpoint.balance;
        }

        // Credit Entry
        LedgerEntry({
            ledgerReason: ledgerReason,
            ledgerType: LedgerType.Credit,
            ledgerAccount: ledgerAccount,
            customer: customer,
            asset: asset,
            amount: amount,
            balance: finalBalance,
            interestRateBPS: 0,
            nextPaymentDate: 0
        });

        return finalBalance;
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
