pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./base/ArrayHelper.sol";

/**
  * @title The Compound Oracle
  * @author Compound
  * @notice The Compound Oracle specifies the value of a set of assets
  * 		as determined by Compound. These asset values are used to make
  * 		fair terms for loan contracts in Compound.
  */
contract Oracle is Owned, ArrayHelper {
	mapping(address => uint64) values;
	address[] assets;

	event NewAsset(address indexed asset);
	event AssetValueUpdate(address indexed asset, uint64 valueInWei);

	/**
	  * @notice Constructs a new Oracle object
	  */
	function Oracle() public {}

	/**
	  * @dev `getSupportedAssets` returns assets which have Oracle values
	  * @return assets List of supported asset addresses
	  */
	function getSupportedAssets() public view returns(address[]) {
		return assets;
	}

	/**
	  * `getAssetValue` returns the Oracle's view of the current
	  * value of a given asset, or zero if unknown.

	  * @param asset The address of the asset to query
	  * @return value The value in wei of the asset, or zero.
	  */
	function getAssetValue(address asset) public view returns(uint64) {
		return values[asset];
	}

	/**
	  * `setAssetValue` sets the value of an asset in Compound.
	  *
	  * @param asset The address of the asset to set
	  * @param valueInWei The value in wei of the asset per unit
	  */
	function setAssetValue(address asset, uint64 valueInWei) public onlyOwner {
		if (!arrayContainsAddress(assets, asset)) {
			assets.push(asset);
			NewAsset(asset);
		}

		// Emit log event
		AssetValueUpdate(asset, valueInWei);

		// Update asset type value
		values[asset] = valueInWei;
	}

}
