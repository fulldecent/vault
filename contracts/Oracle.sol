pragma solidity ^0.4.4;

/*
The Compound Oracle specifies the value of a set of assets
as determined by Compound. These asset values are used to make
fair terms for loan contracts in Compound.
*/
contract Oracle {
	address owner;
	mapping(address => mapping(uint256 => uint256)) values;

	event valueUpdate(address assetType, uint64 valueInWei);

	function Oracle() {
		self.owner = msg.sender;
	}

	/*
	`getAssetValue` returns the Oracle's view of the current
	value of a given asset, or zero if unknown.

	Inputs:
		* assetType (address): The address of the asset to query
	Output:
		* value (uint64): The value in wei of the asset, or zero.
	*/
	function getAssetValue(assetType address) public view {
		return values[assetType];
	}

	function setAssetValue(address assetType, uint64 valueInWei) onlyOwner {
		// Emit log event
		valueUpdate(assetType, valueInWei);

		// Update asset type value
		self.values[assetType] = valueInWei;
	}
}
