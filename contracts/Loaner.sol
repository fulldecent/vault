pragma solidity ^0.4.18;

import "./Ledger.sol";
import "./storage/Oracle.sol";
import "./storage/LoanerStorage.sol";
import "./base/Owned.sol";
import "./base/Graceful.sol";
import "./base/InterestHelper.sol";

/**
  * @title The Compound Loan Account
  * @author Compound
  * @notice A loan account allows customer's to borrow assets, holding other assets as collatoral.
  */
contract Loaner is Graceful, Owned, Ledger, InterestHelper {
    Oracle public oracle;
    LoanerStorage public loanerStorage;

    function Loaner () public {}

    /**
      * @notice `setOracle` sets the oracle storage location for this contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param oracleAddress The contract which acts as the long-term Oracle store
      * @return Success of failure of operation
      */
    function setOracle(address oracleAddress) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        oracle = Oracle(oracleAddress);

        return true;
    }

    /**
      * @notice `setLoanerStorage` sets the loaner storage location for this contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param loanerStorageAddress The contract which acts as the long-term store
      * @return Success of failure of operation
      */
    function setLoanerStorage(address loanerStorageAddress) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        loanerStorage = LoanerStorage(loanerStorageAddress);

        return true;
    }

    /**
      * @notice `customerBorrow` creates a new loan and deposits ether into the user's account.
      * @param asset The asset to borrow
      * @param amount The amount to borrow
      * @return success or failure
      */
    function customerBorrow(address asset, uint amount) public returns (bool) {
        if (!validCollateralRatio(amount)) {
            failure("Loaner::InvalidCollateralRatio", uint256(asset), uint256(amount), getValueEquivalent(msg.sender));
            return false;
        }

        if (!loanerStorage.loanableAsset(asset)) {
            failure("Loaner::AssetNotLoanable", uint256(asset));
            return false;
        }

        debit(LedgerReason.CustomerBorrow, LedgerAccount.Loan, msg.sender, asset, amount);
        credit(LedgerReason.CustomerBorrow, LedgerAccount.Deposit, msg.sender, asset, amount);

        return true;
    }

    /**
      * @notice `customerPayLoan` customer makes a loan payment
      * @param asset The asset to pay down
      * @param amount The amount to pay down
      * @return success or failure
      */
    function customerPayLoan(address asset, uint amount) public returns (bool) {
        if (!accrueLoanInterest(msg.sender, asset)) {
            return false;
        }

        credit(LedgerReason.CustomerPayLoan, LedgerAccount.Loan, msg.sender, asset, amount);
        debit(LedgerReason.CustomerPayLoan, LedgerAccount.Deposit, msg.sender, asset, amount);

        return true;
    }

    /**
      * @notice `getLoanBalance` returns the balance (with interest) for
      *         the given customers's loan of the given asset (e.g. W-Eth or OMG)
      * @param customer The customer
      * @param asset The asset to check the balance of
      * @return The loan balance of given account
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
      * @return The loan balance of given account at timestamp
      */
    function getLoanBalanceAt(address customer, address asset, uint256 timestamp) public view returns (uint256) {
        return balanceWithInterest(
            ledgerStorage.getBalance(customer, uint8(LedgerAccount.Loan), asset),
            ledgerStorage.getBalanceTimestamp(customer, uint8(LedgerAccount.Loan), asset),
            timestamp,
            interestRateStorage.getInterestRate(asset));
    }

    /**
      * @notice `accrueLoanInterest` accrues any current interest on a given loan.
      * @param customer The customer
      * @param asset The asset to accrue loan interest on
      * @return success or failure
      */
    function accrueLoanInterest(address customer, address asset) public returns (bool) {
        if (!checkInterestRateStorage()) {
            return false;
        }

        uint interest = compoundedInterest(
            ledgerStorage.getBalance(customer, uint8(LedgerAccount.Loan), asset),
            ledgerStorage.getBalanceTimestamp(customer, uint8(LedgerAccount.Loan), asset),
            now,
            interestRateStorage.getInterestRate(asset));

        if (interest != 0) {
            credit(LedgerReason.Interest, LedgerAccount.InterestIncome, customer, asset, interest);
            debit(LedgerReason.Interest, LedgerAccount.Loan, customer, asset, interest);
            if (!ledgerStorage.saveCheckpoint(customer, uint8(LedgerAccount.Loan), asset)) {
                revert();
            }
        }

        return true;
    }

    /**
      * @notice `getMaxLoanAvailable` gets the maximum loan availble
      * @param account the address of the account
      * @return uint the maximum loan amout available
      */
    function getMaxLoanAvailable(address account) view public returns (uint) {
        return getValueEquivalent(account) * loanerStorage.minimumCollateralRatio();
    }

    /**
      * @notice `validCollateralRatio` determines if a the requested amount is valid based on the minimum collateral ratio
      * @param requestedAmount the requested loan amount
      * @return boolean true if the requested amount is valid and false otherwise
      */
    function validCollateralRatio(uint requestedAmount) view internal returns (bool) {
        return (getValueEquivalent(msg.sender) * loanerStorage.minimumCollateralRatio()) >= requestedAmount;
    }

    /**
     * @notice `getValueEquivalent` returns the value of the account based on
     * Oracle prices of assets. Note: this includes the Eth value itself.
     * @param acct The account to view value balance
     * @return value The value of the acct in Eth equivalancy
     */
    function getValueEquivalent(address acct) public returns (uint256) {
        uint256 assetCount = oracle.getAssetsLength(); // from Oracle
        uint256 balance = 0;

        for (uint64 i = 0; i < assetCount; i++) {
          address asset = oracle.assets(i);

          balance += oracle.getAssetValue(asset, getBalance(acct, LedgerAccount.Deposit, asset));
          balance -= oracle.getAssetValue(asset, getBalance(acct, LedgerAccount.Loan, asset));
        }

        return balance;
    }

    /**
      * @notice `validOracle` verifies that the Oracle is correct initialized
      * @dev This is just for sanity checking.
      * @return true if successfully initialized, false otherwise
      */
    function validOracle() public returns (bool) {
        bool result = true;

        if (oracle == address(0)) {
            failure("Vault::OracleInitialized");
            result = false;
        }

        if (oracle.allowed() != address(this)) {
            failure("Vault::OracleNotAllowed");
            result = false;
        }

        return result;
    }

    /**
      * @notice `validLoanerStorage` verifies that the LoanerStorage is correct initialized
      * @dev This is just for sanity checking.
      * @return true if successfully initialized, false otherwise
      */
    function validLoanerStorage() public returns (bool) {
        bool result = true;

        if (loanerStorage == address(0)) {
            failure("Vault::LoanerStorageInitialized");
            result = false;
        }

        if (loanerStorage.allowed() != address(this)) {
            failure("Vault::LoanerStorageNotAllowed");
            result = false;
        }

        return result;
    }
}
