pragma solidity ^0.4.18;

import "./Oracle.sol";
import "./Ledger.sol";

/**
  * @title The Compound Vault Contract
  * @author Compound
  * @notice The Compound Vault Contract in the core contract governing
  *         all accounts in Compound.
  */
contract Vault is Oracle, Ledger {
  uint constant LOAN_APR = 20;
  uint constant MIN_LOAN_DURATION = 2;
  uint constant MAX_LOAN_DURATION = 24;
  uint constant PAYMENT_FREQUENCY = 2;
  uint minimumCollateralRatio;
  address[] loanableAssets;

  struct Loan {
        uint balance;
        uint amount;
        uint duration;
        address asset;
        address acct;
    }
    Loan[] loans;
    mapping(address => uint256[]) loanIds;


    /**
      * @notice `Vault` is the core Compound Vault contract
      */
    function Vault (uint minimumCollateralRatio_) public {
        minimumCollateralRatio = minimumCollateralRatio_;
    }

    /**
      * @notice `addLoanableAsset` adds an asset to the list of loanable assets
      * @param asset The address of the assets to add
      */
    function addLoanableAsset(address asset) public onlyOwner {
      loanableAssets.push(asset);
    }

    /**
      * @notice `getValueEquivalent` returns the value of the account based on
      * Oracle prices of assets. Note: this includes the Eth value itself.
      * @param acct The account to view value balance
      * @return value The value of the acct in Eth equivalancy
      */
    function getValueEquivalent(address acct) public view returns (uint256) {
        address[] memory assets = getSupportedAssets(); // from Oracle
        uint256 balance = 0;

        for (uint64 i = 0; i < assets.length; i++) {
            address asset = assets[i];

            balance += getAssetValue(asset) * getBalanceWithInterest(acct, asset, now); // From Ledger
        }

        return balance;
    }

    /**
      * @notice `newLoan` creates a new loan and sends the customer their
      * loaned assests.
      * @param asset The address of the asset being loaned
      * @param amountRequested The amount requested of the asset
      * @return value The amount loaned
      */
    function newLoan(address asset, uint amountRequested, uint duration) public returns (uint256) {
      requireValidLoanDuration(duration);
      require(validCollateralRatio(amountRequested));
      require(loanableAsset(asset));
      Loan memory loan = Loan({
          asset: asset,
          acct: msg.sender,
          amount: amountRequested,
          duration: duration,
          balance: amountRequested
      });

      loans.push(loan);
      uint loanId = loans.length - 1;
      loanIds[msg.sender].push(loanId);

      uint256 amountLoaned = amountRequested;

      if (!Token(asset).transfer(msg.sender, amountLoaned)) {
          revert();
      }

      return loanId;
    }

    /**
      * @notice `payLoan` takes payment from the user's collateral
      * @param loanId the loanId to pay
      */
    function payLoan(address account, uint64 loanId) public returns (
        uint balance,
        uint amount,
        uint duration,
        address asset,
        address acct
    ) {
      Loan storage loan = loans[loanId];
      uint loanPayment = getLoanPayment(loanId);
      loan.balance -= loanPayment;
      debit(account, loan.asset, loanPayment);
      return getLoan(loanId);
    }

    function getLoanPayment(uint loanId) returns (uint) {
      Loan storage loan = loans[loanId];
      Rate rate = rates[loan.asset];
      uint paymentCount = (loan.duration / 2);
      return balanceWithInterest(
        loan.amount,
        0,
        loan.duration * 1 weeks,
        uint64(LOAN_APR),
        uint64(52/loan.duration)) / paymentCount;
    }

    /**
      * @notice `getLoanByLessee` returns a Loan by Lessee
      * @param lesseeAddress The lessee's address
      * @param lesseeLoanId The index of the lesse's loan in a zero based array
      * @return loan The loan represented as a tuple
      */
    function getLoanByLessee(address lesseeAddress, uint lesseeLoanId) public returns (
        uint balance,
        uint amount,
        uint duration,
        address asset,
        address acct
    ) {
      uint loanId = loanIds[lesseeAddress][lesseeLoanId];
      return getLoan(loanId);
    }

    /**
      * @notice `getLoan` returns a Loan
      * @param loanId The loan id as a zero based array
      * @return loan The loan represented as a tuple
      */
    function getLoan(uint loanId) public returns (
        uint balance,
        uint amount,
        uint duration,
        address asset,
        address acct
    ) {
      Loan storage loan = loans[loanId];

      return (
        loan.balance,
        loan.amount,
        loan.duration,
        loan.asset,
        loan.acct
      );
    }

    /**
      * @notice `getLoansLength` returns the length of the array of loans
      * @return loansLength the length of the loan list array
      */
    function getLoansLength(address lesseeAddress, uint loanId) public returns (
        uint loansLength
    ) {
      return loans.length;
    }

    /**
      * @notice `setMinimumCollateralRatio` sets the minimum collateral ratio
      * @param minimumCollateralRatio_ the minimum collateral ratio to be set
          t is valid and false otherwise
      */
    function setMinimumCollateralRatio(uint minimumCollateralRatio_) public onlyOwner {
      minimumCollateralRatio = minimumCollateralRatio_;
    }

    /**
      * @notice `validCollateralRatio` determines if a the requested amount is valid based on the minimum collateral ratio
      * @param requestedAmount the requested loan amount
      * @return boolean true if the requested amoun
          t is valid and false otherwise
      */
    function validCollateralRatio(uint requestedAmount) view internal returns (bool) {
        return (getValueEquivalent(msg.sender) * minimumCollateralRatio) > requestedAmount;
    }

    /**
      * @notice `requireValidLoanDuration` determines if a a loan length is valid
      * @param duration the requested loan amount
      * @return boolean true if the requested length is valid and false otherwise
      */
    function requireValidLoanDuration(uint duration) view internal {
      require(duration >= MIN_LOAN_DURATION);
      require(duration <= MAX_LOAN_DURATION);
      require(duration % PAYMENT_FREQUENCY == 0);
    }

    /**
      * @notice `loanableAsset` determines if the asset is loanable
      * @param asset the assets to query
      * @return boolean true if the asset is loanable, false if not
      */
    function loanableAsset(address asset) view internal returns (bool) {
      return arrayContainsAddress(loanableAssets, asset);
    }


    /**
      * @notice Do not pay directly into Vault, please use `deposit`.
      */
    function() payable public {
        revert();
    }
}
