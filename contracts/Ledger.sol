pragma solidity ^0.4.18;

import "./base/InterestHelper.sol";
import "./base/Token.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Owned, InterestHelper {
    enum LedgerAction { CustomerDeposit, CustomerWithdrawal, Interest }
    enum LedgerAccount { Cash, Loan, Deposit, InterestExpense, InterestIncome }

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
    }

    mapping(address => mapping(LedgerAccount => mapping(address => BalanceCheckpoint))) balanceCheckpoints;
    mapping(address => uint64) rates;

    event InterestRateChange(address asset, uint64 interestRateBPS);
    event LedgerEntry(
        uint8   ledgerAction,  // Ledger action
        uint8   ledgerAccount, // Ledger account
        address customer,      // Customer associated with entry
        address asset,         // Asset associated with this entry
        uint256 amount,        // Amount of asset associated with this entry
        uint256 finalBalance); // Ledger account is Deposit or Loan, the new balance

    /**
      * @notice `Ledger` tracks balances for a given account by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice `setInterestRate` sets the interest rate for a given asset
      * @param interestRateBPS The interest rate per interval
      */
    function setInterestRate(address asset, uint64 interestRateBPS) public onlyOwner {
        InterestRateChange(asset, interestRateBPS);

        rates[asset] = interestRateBPS;
    }

    /**
      * @notice `getInterestRate` returns the interest rate for given asset
      * @param asset The asset to get the interest rate for
      * @return rate The given interest rate in basis points
      */
    function getInterestRate(address asset) public view returns (uint64) {
        return rates[asset];
    }

	/**
      * @notice `getDepositBalanceAtLastCheckpoint` returns the balance (without interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The address of the asset
      * @return balance The balance (without interest) of the asset in given account
      */
    function getDepositBalanceAtLastCheckpoint(address account, address asset) public view returns (uint256) {
        return balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance;
    }

    /**
      * @notice `getLoanBalanceAtLastCheckpoint` returns the balance (without interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The address of the asset
      * @return balance The balance (without interest) of the asset in given account
      */
    function getLoanBalanceAtLastCheckpoint(address account, address asset) public view returns (uint256) {
        return balanceCheckpoints[account][LedgerAccount.Loan][asset].balance;
    }

    /**
      * @notice `getDepositBalanceWithInterest` returns the balance (with interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      */
    function getDepositBalanceWithInterest(address account, address asset, uint256 timestamp) public view returns (uint256) {
        return balanceWithInterest(
            balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance,
            balanceCheckpoints[account][LedgerAccount.Deposit][asset].timestamp,
            timestamp,
            interestRate);
    }

    /**
      * @notice `getLoanBalanceWithInterest` returns the balance (with interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      */
    function getLoanBalanceWithInterest(address account, address asset, uint256 timestamp) public view returns (uint256) {
        return balanceWithInterest(
            balanceCheckpoints[account][LedgerAccount.Loan][asset].balance,
            balanceCheckpoints[account][LedgerAccount.Loan][asset].timestamp,
            timestamp,
            interestRate);
    }

    /**
      * @notice `accrueInterestAndSaveCheckpoint` adds interest to your balance since the last
      * checkpoint and sets the checkpoint to now.
      * @param account the account to accrue interest on
      * @param asset the asset to accrue interest on
      * @return the account balance after accrual
      */
    function accrueInterestAndSaveCheckpoint(LedgerAccount ledgerAccount, address account, address asset) public returns (uint) {
        BalanceCheckpoint checkpoint = balanceCheckpoints[account][asset];
        Rate rate = rates[asset];

        uint interest = balanceWithInterest(
            checkpoint.balance,
            checkpoint.timestamp,
            now,
            rate.interestRate,
            rate.payoutsPerYear) - checkpoint.balance;

        if (interest > 0) {
            if (ledgerAccount == LedgerAccount.Deposit) {
                debit(LedgerAction.Interest, LedgerAccount.InterestExpense, from, asset, interest);
                credit(LedgerAction.Interest, LedgerAccount.Deposit, from, asset, interest);
            } else if (ledgerAccount == LedgerAccount.Loan) {
                debit(LedgerAction.Interest, LedgerAccount.Loan, from, asset, interest);
                credit(LedgerAction.Interest, LedgerAccount.InterestIncome, from, asset, interest);
            }
        }

        return getBalanceAtLastCheckpoint(account, asset);
    }

    /**
      * @notice Debit a ledger account.
      * @param account the account to credit
      * @param asset the asset to credit
      * @param amount amount to credit
      * @param action reason this credit occured
      */
    function debit(LedgerAction ledgerAction, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
        uint256 finalBalance = adjustBalance(
            customer,
            ledgerAction,
            asset,
            amount,
            ledgerAccount == LedgerAccount.Loan);

        // Debit Entry
        LedgerEntry({
          ledgerAction: ledgerAction,
          ledgerAccount: ledgerAccount,
          customer: customer,
          asset: asset,
          amount: amount
          finalBalance: finalBalance
        });
    }

    /**
      * @notice Credit a ledger account.
      * @param account the account to credit
      * @param asset the asset to debit
      * @param amount amount to debit
      * @param action reason this debit occured
      */
    function credit(LedgerAction ledgerAction, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
        uint256 finalBalance = adjustBalance(
            customer,
            ledgerAction,
            asset,
            amount,
            ledgerAccount == LedgerAccount.Deposit);

        // Credit Entry
        LedgerEntry({
          ledgerAction: ledgerAction,
          ledgerAccount: ledgerAccount,
          customer: customer,
          asset: asset,
          amount: amount
          finalBalance: finalBalance
        });
    }

    function adjustBalance(address customer, LedgerAccount ledgerAccount, address asset, uint256 balance, bool isPositive) private returns (uint256) {
        utin256 delta;

        if (isPositive) {
            delta = amount;
        } else {
            delta = 0 - amount;
        }

        if (ledgerAccount == LedgerAccount.Loan && isPositive) {
            // TODO: Adjust interest rate to weighted average for additional principal
            uint256 newRate = 000;
            balanceCheckpoints[customer][ledgerAccount][asset].rate = newRate;
        }

        balanceCheckpoints[customer][ledgerAccount][asset].balance += delta;
        balanceCheckpoints[customer][ledgerAccount][asset].timestamp = now;

        return balanceCheckpoints[customer][ledgerAccount][asset].balance;
    }
}
