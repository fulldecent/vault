pragma solidity ^0.4.18;

import "./Oracle.sol";
import "./Ledger.sol";
import "./Loaner.sol";

/**
  * @title The Compound Bank Contract
  * @author Compound
  * @notice The Compound Bank Contract in the core contract governing
  *         all accounts in Compound.
  */
contract Bank is Oracle, Ledger, Loaner {

    /**
      * @notice `Bank` is the core Compound Bank contract
      */
    function Bank () public {}

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
      * @notice Do not pay directly into Bank, please use `deposit`.
      */
    function() payable public {
        revert();
    }
}
