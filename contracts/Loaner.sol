pragma solidity ^0.4.18;

import "./InterestRate.sol";
import "./Ledger.sol";
import "./Oracle.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Loan Account
  * @author Compound
  * @notice A loan account allows customer's to borrow assets, holding other assets as collatoral.
  */
contract Loaner is Owned, InterestRate, Ledger, Oracle {
  address[] loanableAssets;
    /**
      * @notice `addLoanableAsset` adds an asset to the list of loanable assets
      * @param asset The address of the assets to add
      */

    function addLoanableAsset(address asset) public onlyOwner {
      loanableAssets.push(asset);
    }

    /**
      * @notice `customerBorrow` creates a new loan and deposits ether into the user's account.
      * @param asset The asset to borrow
      * @param amount The amount to borrow
      */
    function customerBorrow(address asset, uint amount) public {
        debit(LedgerReason.CustomerBorrow, LedgerAccount.Loan, msg.sender, asset, amount);
        credit(LedgerReason.CustomerBorrow, LedgerAccount.Deposit, msg.sender, asset, amount);
    }

    /**
      * @notice `customerPayLoan` customer makes a loan payment
      * @param asset The asset to pay down
      * @param amount The amount to pay down
      */
    function customerPayLoan(address asset, uint amount) public {
        accrueLoanInterest(msg.sender, asset);
        credit(LedgerReason.CustomerPayLoan, LedgerAccount.Loan, msg.sender, asset, amount);
        debit(LedgerReason.CustomerPayLoan, LedgerAccount.Deposit, msg.sender, asset, amount);
    }

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
        uint balance;
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(LedgerAccount.Loan)][asset];

        uint interest = compoundedInterest(
            checkpoint.balance,
            checkpoint.timestamp,
            now,
            rates[asset]);

        if (interest == 0) {
            balance = checkpoint.balance;
        } else {
          credit(LedgerReason.Interest, LedgerAccount.InterestIncome, customer, asset, interest);

          balance = debit(LedgerReason.Interest, LedgerAccount.Loan, customer, asset, interest);
        }

        saveCheckpoint(customer, LedgerReason.Interest, LedgerAccount.Loan, asset);

        return balance;
    }
}
