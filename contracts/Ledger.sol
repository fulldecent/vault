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
    }

    struct Rate {
        uint64 interestRate;
        uint64 payoutsPerYear;
    }

    mapping(address => mapping(LedgerAccount => mapping(address => BalanceCheckpoint))) balanceCheckpoints;
    mapping(address => Rate) rates;

    event InterestRateChange(address asset, uint64 interestRate, uint64 payoutsPerYear);
    event LedgerEntry(
        uint8   assetType,     // Asset type which caused this ledger entry
        address assetAddress,  // Asset address if applicable
        uint256 debit,         // debits associated with this asset (positive on balance sheet)
        uint256 credit,        // credits assocated with this asset (negative on balance sheet)
        uint8   action,        // LedgerAction which caused this ledger entry
        address account,       // account for ledger entry (may be nil)
        uint256 finalBalance); // final balance after action if account supplied

    /**
      * @notice `Ledger` tracks balances for a given account by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice `setInterestRate` sets the interest rate for a given asset
      * @param interestRate The interest rate per internval
      * @param payoutsPerYear The number of payouts per year
      */
    function setInterestRate(address asset, uint64 interestRate, uint64 payoutsPerYear) public onlyOwner {
        InterestRateChange(asset, interestRate, payoutsPerYear);

        rates[asset] = Rate({
            interestRate: interestRate,
            payoutsPerYear: payoutsPerYear
        });
    }

    /**
      * @notice `getInterestRate` returns the interest rate for given asset
      * @param asset The asset to get the interest rate for
      * @return rate The given interest rate
      */
    function getInterestRate(address asset) public view returns (uint64, uint64) {
        Rate memory rate = rates[asset];

        return (rate.interestRate, rate.payoutsPerYear);
    }

	/**
      * @notice `getBalanceAtLastCheckpoint` returns the balance (without interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The address of the asset
      * @return balance The balance (without interest) of the asset in given account
      */
    function getBalanceAtLastCheckpoint(address account, address asset) public view returns (uint256) {
        return balanceCheckpoints[account][asset].balance;
    }

    /**
      * @notice `getBalanceWithInterest` returns the balance (with interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      */
    function getBalanceWithInterest(address account, address asset, uint256 timestamp) public view returns (uint256) {
        return balanceWithInterest(
            balanceCheckpoints[account][asset].balance,
            balanceCheckpoints[account][asset].timestamp,
            timestamp,
            rates[asset].interestRate,
            rates[asset].payoutsPerYear);
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
            // TODO: This part is very confusing...
            if (ledgerAccount == LedgerAccount.Deposit) {
                debit(LedgerAction.Interest, LedgerAccount.InterestExpense, from, asset, interest);
                credit(LedgerAction.Interest, LedgerAccount.Deposit, from, asset, interest);
            } else if (ledgerAccount == LedgerAccount.Loan) {
                // TODO: What happens if this goes negative???
                debit(LedgerAction.Interest, LedgerAccount.Deposit, from, asset, interest);
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
        uint256 finalBalance;

        if (ledgerAccount == LedgerAccount.Deposit) {
            balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance += amount;
            balanceCheckpoints[account][LedgerAccount.Deposit][asset].timestamp = now;

            finalBalance = balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance;
        } else if (ledgerAccount == LedgerAccount.Loan) {
            balanceCheckpoints[account][LedgerAccount.Loan][asset].balance -= amount;
            balanceCheckpoints[account][LedgerAccount.Loan][asset].timestamp = now;

            finalBalance = balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance;
        }

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
        uint256 finalBalance;

        if (ledgerAccount == LedgerAccount.Deposit) {
            balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance -= amount;
            balanceCheckpoints[account][LedgerAccount.Deposit][asset].timestamp = now;

            finalBalance = balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance;
        } else if (ledgerAccount == LedgerAccount.Loan) {
            balanceCheckpoints[account][LedgerAccount.Loan][asset].balance += amount;
            balanceCheckpoints[account][LedgerAccount.Loan][asset].timestamp = now;

            finalBalance = balanceCheckpoints[account][LedgerAccount.Deposit][asset].balance;
        }

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
}
