pragma solidity ^0.4.18;

import "../base/Allowed.sol";
import "../base/ArrayHelper.sol";
import "../base/Owned.sol";

contract LoanerStorage is Owned, Allowed, ArrayHelper {
	address[] public loanableAssets;
    uint public minimumCollateralRatio;

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

        return true;
    }

    /**
      * @notice `loanableAsset` determines if the asset is loanable
      * @param asset the assets to query
      * @return boolean true if the asset is loanable, false if not
      */
    function loanableAsset(address asset) public returns (bool) {
        return arrayContainsAddress(loanableAssets, asset);
    }
}