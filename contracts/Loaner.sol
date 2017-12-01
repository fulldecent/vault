pragma solidity ^0.4.18;

import "./InterestBearingBalanceSheet.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Loan Account
  * @author Compound
  * @notice A loan account allows customer's to borrow assets, holding other assets as collatoral.
  */
contract Loaner is Owned, InterestBearingBalanceSheet {
    // function customerBorrow(address ) {
 	//     if allow(....) {
 	//         debit(LedgerAction.CustomerLoan, LedgerAccount.Loan, from, asset, amount);
 	//         credit(LedgerAction.CustomerLoan, LedgerAccount.Deposit, from, asset, amount);
 	//     }
 	// }

    /**
      * @notice `getLoanBalance` returns the balance (with interest) for
      *         the given customers's loan of the given asset (e.g. W-Eth or OMG)
      * @param customer The customer
      * @param asset The asset to check the balance of
      */
    function getLoanBalance(address customer, address asset) public view returns (uint256) {
        return getLoanBalanceAt(
            customer,
            asset,
            now);
    }

    /**
      * @notice `getLoanBalanceAt` returns the balance (with interest) for
      *         the given account's loan of the given asset (e.g. W-Eth or OMG)
      * @param customer The customer
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      */
    function getLoanBalanceAt(address customer, address asset, uint256 timestamp) public view returns (uint256) {
        return balanceWithInterest(
            balanceCheckpoints[customer][uint8(LedgerAccount.Loan)][asset].balance,
            balanceCheckpoints[customer][uint8(LedgerAccount.Loan)][asset].timestamp,
            timestamp,
            rates[asset]);
    }

    /**
      * @notice `accrueLoanInterest` accrues any current interest on a given loan.
      * @param customer The customer
      * @param asset The asset to accrue loan interest on
      */
    function accrueLoanInterest(address customer, address asset) public returns (uint256) {
        return accrueInterestAndSaveCheckpoint(LedgerAccount.Loan, customer, asset);
    }
}
