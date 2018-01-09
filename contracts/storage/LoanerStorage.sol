pragma solidity ^0.4.18;

import "../base/Owned.sol";
import "../base/Allowed.sol";
import "../base/ArrayHelper.sol";
import "../base/Owned.sol";

/**
  * @title The Compound Loaner Storage Contract
  * @author Compound
  * @notice The Loaner Storage contract is a simple contract to keep track of loaner information (e.g. which assets are lendable).
  */
contract LoanerStorage is Owned, Allowed, ArrayHelper {
	address[] public loanableAssets;
    uint public minimumCollateralRatio;

    event NewLoanableAsset(address asset);
    event MinimumCollateralRatioChange(uint newMinimumCollateralRatio);

    /**
      * @notice `addLoanableAsset` adds an asset to the list of loanable assets
      * @param asset The address of the assets to add
      * @return success or failure
      */
    function addLoanableAsset(address asset) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        loanableAssets.push(asset);

        NewLoanableAsset(asset);

        return true;
    }

    /**
      * @notice `setMinimumCollateralRatio` sets the minimum collateral ratio
      * @param minimumCollateralRatio_ the minimum collateral ratio to be set
      * @return success or failure
      */
    function setMinimumCollateralRatio(uint minimumCollateralRatio_) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        minimumCollateralRatio = minimumCollateralRatio_;

        MinimumCollateralRatioChange(minimumCollateralRatio_);

        return true;
    }

    /**
      * @notice `loanableAsset` determines if the asset is loanable
      * @param asset the assets to query
      * @return boolean true if the asset is loanable, false if not
      */
    function loanableAsset(address asset) public view returns (bool) {
        return arrayContainsAddress(loanableAssets, asset);
    }
}