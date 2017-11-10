pragma solidity ^0.4.4;

/**
  * @title The Compound Oracle
  * @author Compound
  * @notice The Compound Oracle specifies the value of a set of assets
  * as determined by Compound. These asset values are used to make
  * fair terms for loan contracts in Compound.
  */
contract Oracle {
	address owner;
	mapping(address => uint64) values;

	event AssetValueUpdate(address indexed asset, uint64 valueInWei);

	/**
	  * @notice Constructs a new Oracle object
	  */
	function Oracle() public {
		owner = msg.sender;
	}

	/**
	  * @dev `onlyOwner` functions may only be called by the creator of this contract.
	  */
	modifier onlyOwner {
		require(msg.sender == owner);
		_;
    }

	/**
	  * `getAssetValue` returns the Oracle's view of the current
	  * value of a given asset, or zero if unknown.

	  * @param asset The address of the asset to query
	  * @return value (uint64): The value in wei of the asset, or zero.
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
		// Emit log event
		AssetValueUpdate(asset, valueInWei);

		// Update asset type value
		values[asset] = valueInWei;
	}
}
