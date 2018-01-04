pragma solidity ^0.4.18;

import "../base/Allowed.sol";

contract LedgerStorage is Allowed {
    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
        uint256 nextPaymentDate;
    }

	// A map of customer -> LedgerAccount{Deposit, Loan} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    function reduceBalanceByAmount(address customer, uint8 ledgerAccount, address asset, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

    	BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];
    	checkpoint.balance -= amount;

        return true;
    }

    function increaseBalanceByAmount(address customer, uint8 ledgerAccount, address asset, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

    	BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];
    	checkpoint.balance += amount;

        return true;
    }

    function getBalance(address customer, uint8 ledgerAccount, address asset) returns (uint256) {
    	return balanceCheckpoints[customer][ledgerAccount][asset].balance;
    }

    function getBalanceTimestamp(address customer, uint8 ledgerAccount, address asset) returns (uint256) {
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