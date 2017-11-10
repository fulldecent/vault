pragma solidity ^0.4.18;

import "./Oracle.sol";
import "./Ledger.sol";
import "./Loaner.sol";

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
        uint256 balance = getBalanceWithInterest(acct, address(0), now); // From Ledger

        for (uint i = 0; i < assets.length; i++) {
            // TODO: Interest on tokens
            address asset = assets[i];
            balance += getAssetValue(asset);
        }
    }

    /**
      * @notice Do not pay directly into Bank, please use `deposit`.
      */
    function() payable public {
        revert();
    }
}
