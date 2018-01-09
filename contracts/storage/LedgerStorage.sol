pragma solidity ^0.4.18;

import "../base/Allowed.sol";
import "../base/Graceful.sol";

/**
  * @title The Compound Ledger Storage Contract
  * @author Compound
  * @notice The Ledger Storage contract is a simple contract to keep track of ledger entries.
  */
contract LedgerStorage is Graceful, Allowed {
    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
        uint256 nextPaymentDate;
    }

    event BalanceIncrease(address indexed customer, uint8 ledgerAccount, address indexed asset, uint256 amount);
    event BalanceDecrease(address indexed customer, uint8 ledgerAccount, address indexed asset, uint256 amount);

	// A map of customer -> LedgerAccount{Deposit, Loan} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    /**
      * @notice `increaseBalanceByAmount` increases a balances account by a given amount
      * @param customer The customer whose account to increase
      * @param ledgerAccount An integer representing a ledger account to increase
      * @param asset The asset to increase the balance of
      * @param amount The amount to increase the balance
      * @return success or failure of operation
      */
    function increaseBalanceByAmount(address customer, uint8 ledgerAccount, address asset, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];

        if (checkpoint.balance + amount < checkpoint.balance) {
            failure("LedgerStorage::BalanceOverflow", uint256(customer), uint256(asset), checkpoint.balance, amount);
            return false;
        }

        checkpoint.balance += amount;

        BalanceIncrease(customer, ledgerAccount, asset, amount);

        return true;
    }

    /**
      * @notice `decreaseBalanceByAmount` reduces a balances account by a given amount
      * @param customer The customer whose account to reduce
      * @param ledgerAccount An integer representing a ledger account to reduce
      * @param asset The asset to reduce the balance of
      * @param amount The amount to reduce the balance
      * @return success or failure of operation
      */
    function decreaseBalanceByAmount(address customer, uint8 ledgerAccount, address asset, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];

        if (checkpoint.balance - amount > checkpoint.balance) {
            failure("LedgerStorage::InsufficientBalance", uint256(customer), uint256(asset), checkpoint.balance, amount);
            return false;
        }

        checkpoint.balance -= amount;

        BalanceDecrease(customer, ledgerAccount, asset, amount);

        return true;
    }

    /**
      * @notice `getBalance` returns the given customer's balance of an asset in an account
      * @param customer The customer whose account to query
      * @param ledgerAccount An integer representing a ledger account to query
      * @param asset The asset to query the balance of
      * @return balance of given asset
      */
    function getBalance(address customer, uint8 ledgerAccount, address asset) public view returns (uint256) {
    	return balanceCheckpoints[customer][ledgerAccount][asset].balance;
    }

    /**
      * @notice `getBalanceTimestamp` returns the timestamp of the given customer's balance checkpoint
      * @dev Timestamps are used to notify us that we haven't updated interest since this time.
      * @param customer The customer whose account to query
      * @param ledgerAccount An integer representing a ledger account to query
      * @param asset The asset to query the timestamp of
      * @return timestamp of given asset's balance checkpoint
      */
    function getBalanceTimestamp(address customer, uint8 ledgerAccount, address asset) public view returns (uint256) {
    	return balanceCheckpoints[customer][ledgerAccount][asset].timestamp;
    }

    /**
      * @notice Saves a balance checkpoint
      * @param customer The customer to checkpoint
      * @param ledgerAccount Which ledger account to checkpoint
      * @param asset The asset which is being checkpointed
      */
    function saveCheckpoint(
        address customer,
        uint8 ledgerAccount,
        address asset
    ) returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];
        checkpoint.timestamp = now;

        return true;
    }
}