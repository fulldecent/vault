pragma solidity ^0.4.18;

import "./Oracle.sol";
import "./Ledger.sol";

/**
  * @title The Compound Bank Contract
  * @author Compound
  * @notice The Compound Bank Contract in the core contract governing
  *         all accounts in Compound.
  */
contract Bank is Oracle, Ledger {
  uint minimumCollateralRatio;

	struct Loan {
        uint balance;
        uint amount;
        address asset;
        address acct;
    }

    // TODO: Store as map and list?
    // TODO: Functions to retreive loans
    Loan[] loans;


    /**
      * @notice `Bank` is the core Compound Bank contract
      */
    function Bank (uint minimumCollateralRatio_) public {
        minimumCollateralRatio = minimumCollateralRatio_;
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
      * @notice `newLoan` creates a new loan and sends the customer their       * loaned assests.
      * @param asset The address of the asset being loaned
      * @param amountRequested The amount requested of the asset
      * @return value The amount loaned
      */
    function newLoan(address asset, uint amountRequested) public returns (uint256) {
      // Compound currently only allows loans in ETH
      // TODO: Check asset type is supported for loans
      // TODO: Check sufficient asset value
      require(validCollateralRatio(amountRequested));
      Loan memory loan = Loan({
          asset: asset,
          acct: msg.sender,
          amount: amountRequested,
          balance: amountRequested
      });

      loans.push(loan);

      uint256 amountLoaned = amountRequested;

      // TODO: If not revert
      if (!Token(asset).transfer(msg.sender, amountLoaned)) {
          revert();
      }

      return amountLoaned;
    }

    /**
      * @notice `setMinimumCollateralRatio` sets the minimum collateral ratio
      * @param minimumCollateralRatio_ the minimum collateral ratio to be set
          t is valid and false otherwise
      */
    function setMinimumCollateralRatio(uint minimumCollateralRatio_) public {
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
      * @notice Do not pay directly into Bank, please use `deposit`.
      */
    function() payable public {
        revert();
    }
}
