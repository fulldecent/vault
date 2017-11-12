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
    struct Balance {
        uint256 amount;
        uint256 timestamp;
    }

    struct Rate {
        uint64 interestRate;
        uint64 payoutsPerYear;
    }

    mapping(address => mapping(address => Balance)) balances;
    mapping(address => Rate) rates;

    event InterestRateChange(address asset, uint64 interestRate, uint64 payoutsPerYear);
    event LedgerEntry(address account, address asset, uint256 debit, uint256 credit);

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
      * @notice `getAccountBalanceRaw` returns the balance (without interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The address of the asset
      * @return balance The balance (without interest) of the asset in given account
      */
    function getAccountBalanceRaw(address account, address asset) public view returns (uint256) {
        return balances[account][asset].amount;
    }

    /**
      * @notice `getBalanceWithInterest` returns the balance (with interest) for
      * the given account in the given asset (e.g. W-Eth or OMG)
      * @param account The account to get the balance of
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      */
    function getBalanceWithInterest(address account, address asset, uint256 timestamp) public view returns (uint256) {
        Balance memory balance = balances[account][asset];

        Rate storage rate = rates[asset];

        uint256 principal = balance.amount;
        uint256 lastEntryTimestamp = balance.timestamp;
        uint256 duration = (timestamp - lastEntryTimestamp) / (1 years);
        uint256 payouts = duration * rate.payoutsPerYear;
        uint256 amortization = principal;

        for (uint64 _i = 0; _i < payouts; _i++) {
            amortization = amortization + ((amortization * rate.interestRate) / 100 / rate.payoutsPerYear);
        }

        return amortization;
    }

    /**
      * @notice `deposit` deposits a given asset in the bank vault.
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

        LedgerEntry(from, asset, amount, 0);
        LedgerEntry(address(this), asset, 0, amount);

        // TODO: Calculate current balance

        // Add balance for the same `from` address
        balances[from][asset].amount += amount;
        balances[from][asset].timestamp = now;
    }

    /**
      * @notice `withdraw` withdraws a given amount from an account's balance.
      * @param asset Asset type to withdraw
      * @param amount amount to withdraw
      */
    function withdraw(address asset, uint256 amount, address to) public {
        // TODO: Upgrade to balance with interest
        uint256 balance = getAccountBalanceRaw(msg.sender, asset);

        assert(amount <= balance);

        LedgerEntry(msg.sender, asset, 0, amount);
        LedgerEntry(address(this), asset, amount, 0);

        // Subtract amount from that sender's balance
        balances[msg.sender][asset].amount -= amount;

        // Transfer asset out to `to` address
        if (!Token(asset).transfer(to, amount)) {
            revert();
        }
    }
}