pragma solidity ^0.4.19;

import "../base/Owned.sol";
import "../base/Allowed.sol";
import "../base/ArrayHelper.sol";
import "../base/Owned.sol";

/**
  * @title The Compound Borrow Storage Contract
  * @author Compound
  * @notice The Borrow Storage contract is a simple contract to
  *         keep track of borrower information: which assets can be
  *         borrowed and the global minimum collateral ratio.
  */
contract BorrowStorage is Owned, Allowed, ArrayHelper {
    address[] public borrowableAssets;
    uint256 public minimumCollateralRatio;

    event NewBorrowableAsset(address asset);
    event MinimumCollateralRatioChange(uint256 newMinimumCollateralRatio);

    /**
      * @notice `addBorrowableAsset` adds an asset to the list of borrowable assets
      * @param asset The address of the assets to add
      * @return success or failure
      */
    function addBorrowableAsset(address asset) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        borrowableAssets.push(asset);

        NewBorrowableAsset(asset);

        return true;
    }

    /**
      * @notice `setMinimumCollateralRatio` sets the minimum collateral ratio
      * @param minimumCollateralRatio_ the minimum collateral ratio to be set
      * @dev used like this to gate borrow creation: borrower_account_value * minimumCollateralRatio >= borrow_amount
      * @return success or failure
      */
    function setMinimumCollateralRatio(uint256 minimumCollateralRatio_) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        minimumCollateralRatio = minimumCollateralRatio_;

        MinimumCollateralRatioChange(minimumCollateralRatio_);

        return true;
    }

    /**
      * @notice `borrowableAsset` determines if the asset is borrowable
      * @param asset the assets to query
      * @return boolean true if the asset is borrowable, false if not
      */
    function borrowableAsset(address asset) public view returns (bool) {
        return arrayContainsAddress(borrowableAssets, asset);
    }
}