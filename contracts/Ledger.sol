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
    enum LedgerAction { Deposit, Withdrawal, Interest }

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
    }

    struct Rate {
        uint64 interestRate;
        uint64 payoutsPerYear;
    }

    mapping(address => mapping(address => BalanceCheckpoint)) balanceCheckpoints;
    mapping(address => Rate) rates;

    event InterestRateChange(address asset, uint64 interestRate, uint64 payoutsPerYear);
    event LedgerEntry(
        address account,       // account for ledger entry (may be ourselves)
        address asset,         // asset which is being moved
        uint256 debit,         // debits associated with this asset (positive on balance sheet)
        uint256 credit,        // credits assocated with this asset (negative on balance sheet)
        uint8   action,        // LedgerAction which caused this ledger entry
        uint256 finalBalance); // final balance after action (will be 0 when `account=address(this)`)

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
      * @notice `deposit` deposits a given asset in the Vault.
      * @param asset Asset to deposit
      * @param from The account to pull asset from
      * @param amount The amount of asset to deposit
      */
    function deposit(address asset, uint256 amount, address from) public {
        // TODO: Should we verify that from matches `msg.sender` or `msg.originator`?

        // Transfer ourselves the asset from `from`
        if (!Token(asset).transferFrom(from, address(this), amount)) {
            return revert();
        }
        accrueInterestAndSaveCheckpoint(from, asset);

        credit(from, asset, amount, LedgerAction.Deposit);
    }

    /**
      * @notice `withdraw` withdraws a given amount from an account's balance.
      * @param asset Asset type to withdraw
      * @param amount amount to withdraw
      */
    function withdraw(address asset, uint256 amount, address to) public {
        uint256 balance = accrueInterestAndSaveCheckpoint(msg.sender, asset);
        assert(amount <= balance);

        debit(msg.sender, asset, amount, LedgerAction.Withdrawal);

        // Transfer asset out to `to` address
        if (!Token(asset).transfer(to, amount)) {
            revert();
        }
    }

    /**
      * @notice `accrueInterestAndSaveCheckpoint` adds interest to your balance since the last
      * checkpoint and sets the checkpoint to now.
      * @param account the account to accrue interest on
      * @param asset the asset to accrue interest on
      * @return the account balance after accrual
      */
    function accrueInterestAndSaveCheckpoint(address account, address asset) public returns (uint) {
        BalanceCheckpoint checkpoint = balanceCheckpoints[account][asset];
        Rate rate = rates[asset];

        uint interest = balanceWithInterest(
            checkpoint.balance,
            checkpoint.timestamp,
            now,
            rate.interestRate,
            rate.payoutsPerYear) - checkpoint.balance;

        if (interest > 0) {
          credit(account, asset, interest, LedgerAction.Interest);
        }

        return getBalanceAtLastCheckpoint(account, asset);
    }

    /**
      * @notice credit an account.
      * @param account the account to credit
      * @param asset the asset to credit
      * @param amount amount to credit
      * @param action reason this credit occured
      */
    function credit(address account, address asset, uint256 amount, LedgerAction action) internal {
        balanceCheckpoints[account][asset].balance += amount;
        balanceCheckpoints[account][asset].timestamp = now;

        // Add ledger entry for the account
        LedgerEntry(account, asset, amount, 0, uint8(action), balanceCheckpoints[account][asset].balance);

        // Add ledger entry for the ledger contract itself
        LedgerEntry(address(this), asset, 0, amount, uint8(action), 0);
    }

    /**
      * @notice debit an account.
      * @param account the account to credit
      * @param asset the asset to debit
      * @param amount amount to debit
      * @param action reason this debit occured
      */
    function debit(address account, address asset, uint256 amount, LedgerAction action) internal {
        balanceCheckpoints[account][asset].balance -= amount;
        balanceCheckpoints[account][asset].timestamp = now;

        // Add ledger entry for the account
        LedgerEntry(account, asset, 0, amount, uint8(action), balanceCheckpoints[account][asset].balance);

        // Add ledger entry for the ledger contract itself
        LedgerEntry(address(this), asset, amount, 0, uint8(action), 0);
    }
}
