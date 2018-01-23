pragma solidity ^0.4.18;

import "./Ledger.sol";
import "./base/Owned.sol";
import "./base/Graceful.sol";
import "./base/Token.sol";
import "./storage/Oracle.sol";
import "./storage/LoanerStorage.sol";

/**
  * @title The Compound Loan Account
  * @author Compound
  * @notice A loan account allows customer's to borrow assets, holding other assets as collateral.
  */
contract Loaner is Graceful, Owned, Ledger {
    Oracle public oracle;
    LoanerStorage public loanerStorage;
    InterestRateStorage public borrowInterestRateStorage;
    uint16 public borrowRateSlopeBPS = 2000;
    uint16 public minimumBorrowRateBPS = 1000;

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
      * @notice `setBorrowInterestRateStorage` sets the interest rate storage location for this loaner contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param borrowInterestRateStorage_ The contract which acts as the long-term data store
      * @return Success of failure of operation
      */
    function setBorrowInterestRateStorage(InterestRateStorage borrowInterestRateStorage_) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        borrowInterestRateStorage = borrowInterestRateStorage_;

        return true;
    }

    /**
      * @notice `checkBorrowInterestRateStorage` verifies interest rate store has been set
      * @return True if interest rate store is initialized, false otherwise
      */
    function checkBorrowInterestRateStorage() internal returns (bool) {
        if (borrowInterestRateStorage == address(0)) {
            failure("Loaner::InterestRateStorageUnitialized");
            return false;
        }

        return true;
    }

    /**
      * @notice `customerBorrow` creates a new loan and deposits the requested asset into the user's account.
      * @param asset The asset to borrow
      * @param amount The amount to borrow
      * @return success or failure
      */
    function customerBorrow(address asset, uint amount) public returns (bool) {

        if (!loanerStorage.loanableAsset(asset)) {
            failure("Loaner::AssetNotLoanable", uint256(asset));
            return false;
        }

        if (!validCollateralRatio(amount, asset)) {
            failure("Loaner::InvalidCollateralRatio", uint256(asset), uint256(amount), getValueEquivalent(msg.sender));
            return false;
        }

        // TODO: If customer already has a loan of asset, we need to make sure we can handle the change.
        // Before adding the new amount we will need to either calculate interest on existing loan amount or snapshot
        // the current loan balance.
        // Alternatively: Block additional loan for same asset.

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
      * @notice `convertCollateral` converts specified amount of collateral asset into loan asset to improve the borrower's
                collateral ratio for the loan.
      * @param borrower the borrower who took out the loan
      * @param paymentAsset asset with which to reduce the loan balance
      * @param amountInPaymentAsset how much of the paymentAsset to use (in wei-equivalent)
      * @param loanAsset the asset that was borrowed; must differ from paymentAsset
     **/
    function convertCollateral(address borrower, address paymentAsset, uint256 amountInPaymentAsset, address loanAsset) public returns (bool) {

        if(loanAsset == paymentAsset) {
            failure("Loaner::CollateralSameAsLoan", uint256(loanAsset));
            return false;
        }

        if(amountInPaymentAsset == 0) {
            failure("Loaner::ZeroCollateralAmount", uint256(loanAsset));
            return false;
        }

        if(!validOracle()) {
            return false;
        }

        // true up balance first
        if(!accrueLoanInterest(borrower, loanAsset)) {
            return false;
        }

        uint loanBalance = getBalance(borrower, LedgerAccount.Loan, loanAsset);
        if(loanBalance == 0) {
            failure("Loaner::ZeroLoanBalance", uint256(loanAsset));
            return false;
        }

        // Only allow conversion if the collateral ratio is NOT valid for the current balance
        if (validCollateralRatioNotSender(borrower, loanBalance, loanAsset)) {
            failure("Loaner::ValidCollateralRatio", uint256(loanAsset), uint256(loanBalance), getValueEquivalent(borrower));
            return false;
        }

        uint amountInLoanAsset = oracle.getConvertedAssetValue(paymentAsset, amountInPaymentAsset, loanAsset);

        if(amountInLoanAsset > loanBalance) {
            failure("Loaner::TooMuchCollateral", uint256(amountInLoanAsset), uint256(loanBalance), amountInPaymentAsset);
            return false;
        }

        // record loss of collateral
        debit(LedgerReason.CollateralPayLoan, LedgerAccount.Deposit, borrower, paymentAsset, amountInPaymentAsset);
        credit(LedgerReason.CollateralPayLoan, LedgerAccount.Trading, borrower, paymentAsset, amountInPaymentAsset);

        // reduce loan
        credit(LedgerReason.CollateralPayLoan, LedgerAccount.Loan, borrower, loanAsset, amountInLoanAsset);
        debit(LedgerReason.CollateralPayLoan, LedgerAccount.Trading, borrower, loanAsset, amountInLoanAsset);

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
        return borrowInterestRateStorage.getCurrentBalance(
            asset,
            ledgerStorage.getBalanceBlockNumber(customer, uint8(LedgerAccount.Loan), asset),
            ledgerStorage.getBalance(customer, uint8(LedgerAccount.Loan), asset)
        );
    }

    /**
      * @notice `accrueLoanInterest` accrues any current interest on a given loan.
      * @param customer The customer
      * @param asset The asset to accrue loan interest on
      * @return success or failure
      */
    function accrueLoanInterest(address customer, address asset) public returns (bool) {
        if (!checkBorrowInterestRateStorage()) {
            return false;
        }

        uint blockNumber = ledgerStorage.getBalanceBlockNumber(customer, uint8(LedgerAccount.Loan), asset);

        if (blockNumber != block.number) {
            uint balanceWithInterest = getLoanBalance(customer, asset);
            uint balanceLessInterest = ledgerStorage.getBalance(customer, uint8(LedgerAccount.Loan), asset);

            if (balanceWithInterest - balanceLessInterest > balanceWithInterest) {
                // Interest should never be negative
                failure("Loaner::InterestUnderflow", uint256(asset), uint256(customer), balanceWithInterest, balanceLessInterest);
                return false;
            }

            uint interest = balanceWithInterest - balanceLessInterest;

            if (interest != 0) {
                credit(LedgerReason.Interest, LedgerAccount.InterestIncome, customer, asset, interest);
                debit(LedgerReason.Interest, LedgerAccount.Loan, customer, asset, interest);
                if (!ledgerStorage.saveCheckpoint(customer, uint8(LedgerAccount.Loan), asset)) {
                    revert();
                }
          }
        }

        return true;
    }

    /**
      * @notice `getMaxLoanAvailable` gets the maximum loan available
      * @param account the address of the account
      * @return uint the maximum loan amount available
      */
    function getMaxLoanAvailable(address account) view public returns (uint) {
        return getValueEquivalent(account) * loanerStorage.minimumCollateralRatio();
    }

    /**
      * @notice `validCollateralRatio` determines if a the requested amount is valid based on the minimum collateral ratio
      * @param loanAmount the requested loan amount
      * @param loanAsset denomination of loan
      * @return boolean true if the requested amount is valid and false otherwise
      */
    function validCollateralRatio(uint loanAmount, address loanAsset) view internal returns (bool) {
        return validCollateralRatioNotSender(msg.sender, loanAmount, loanAsset);
    }

    /**
      * @notice `validCollateralRatioNotSender` determines if a the requested amount is valid for the specified borrower based on the minimum collateral ratio
      * @param borrower the borrower whose collateral should be examined
      * @param loanAmount the requested (or current) loan amount
      * @param loanAsset denomination of loan
      * @return boolean true if the requested amount is valid and false otherwise
      */
    function validCollateralRatioNotSender(address borrower, uint loanAmount, address loanAsset) view internal returns (bool) {
        return (getValueEquivalent(borrower) * loanerStorage.minimumCollateralRatio()) >= oracle.getAssetValue(loanAsset, loanAmount);
    }

    /**
     * @notice `getValueEquivalent` returns the value of the account based on
     * Oracle prices of assets. Note: this includes the Eth value itself.
     * @param acct The account to view value balance
     * @return value The value of the acct in Eth equivalency
     */
    function getValueEquivalent(address acct) public view returns (uint256) {
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
      * @notice `validLoanerStorage` verifies that the LoanerStorage is correctly initialized
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

    /**
      * DEPRECATED. DO NOT USE.
      * @notice `getBorrowInterestRateBPS` returns the current borrow interest rate based on the balance sheet
      * @param asset address of asset
      * @return the current borrow interest rate (in basis points)
      */
    function getBorrowInterestRateBPS(address asset) public view returns (uint64) {
        uint256 cash = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Cash));
        uint256 borrows = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Loan));

        // `borrow r` == 10% + (1-`reserve ratio`) * 20%
        // note: this is done in one-line since intermediate results would be truncated
        return uint64( minimumBorrowRateBPS + ( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / ( cash + borrows ) ) ) * borrowRateSlopeBPS / basisPointMultiplier );
    }

    /**
      * @notice `getScaledBorrowRatePerGroup` returns the current borrow interest rate based on the balance sheet
      * @param asset address of asset
      * @param interestRateScale multiplier used in interest rate storage. We need it here to reduce truncation issues.
      * @param blockUnitsPerYear based on block group size in interest rate storage. We need it here to reduce truncation issues.
      * @return the current borrow interest rate (in basis points)
      */
    function getScaledBorrowRatePerGroup(address asset, uint interestRateScale, uint blockUnitsPerYear) public view returns (uint64) {
        uint256 cash = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Cash));
        uint256 borrows = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Loan));

        // `borrow r` == 10% + (1-`reserve ratio`) * 20%
        // note: this is done in one-line since intermediate results would be truncated

        return uint64( (minimumBorrowRateBPS + ( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / ( cash + borrows ) ) ) * borrowRateSlopeBPS / basisPointMultiplier )  * (interestRateScale / (blockUnitsPerYear*basisPointMultiplier)));
    }


    /**
      * @notice `snapshotBorrowInterestRate` snapshots the current interest rate for the block uint
      * @param asset address of asset
      * @return true on success, false if failure (e.g. snapshot already taken for this block uint)
      * TODO: Test
      */
    function snapshotBorrowInterestRate(address asset) public returns (bool) {
      uint64 rate = getScaledBorrowRatePerGroup(asset,
          borrowInterestRateStorage.getInterestRateScale(),
          borrowInterestRateStorage.getBlockUnitsPerYear());

      return borrowInterestRateStorage.snapshotCurrentRate(asset, rate);
    }
}
