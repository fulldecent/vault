pragma solidity ^0.4.18;

import "../base/Allowed.sol";
import "../base/Owned.sol";
import "../base/Token.sol";

/**
  * @title The Compound Token Store Contract
  * @author Compound
  * @notice The Token Store contract holds all tokens.
  */
contract TokenStore is Owned, Allowed {

	event TransferIn(address indexed asset, address indexed from, uint256 amount);
	event TransferOut(address indexed asset, address indexed to, uint256 amount);

	/**
     * @notice Constructs a new TokenStore object
     */
    function TokenStore() public {}

    /**
      * @notice `transferAssetIn` transfer an asset from a given asset to ourselves
      * @dev This is current unused as approvals are given to Vault, not TokenStore
      * @param asset Asset to transfer
      * @param from Address to transfer from
      * @param amount Amount to transfer of asset
      * @return success or failure of operation
      */
	function transferAssetIn(address asset, address from, uint256 amount) public returns (bool) {
		if (!checkAllowed()) {
			return false;
		}

		if (!Token(asset).transferFrom(from, address(this), amount)) {
			failure("TokenStore::TokenTransferFromFail", uint256(asset), uint256(amount), uint256(from));
            return false;
		}

		TransferIn(asset, from, amount);

		return true;
	}

	/**
      * @notice `transferAssetOut` transfer an asset from this contract to a destination
      * @param asset Asset to transfer
      * @param to Address to transfer to
      * @param amount Amount to transfer of asset
      * @return success or failure of operation
      */
	function transferAssetOut(address asset, address to, uint256 amount) public returns (bool) {
		if (!checkAllowed()) {
			return false;
		}

		if (!Token(asset).transfer(to, amount)) {
			failure("TokenStore::TokenTransferToFail", uint256(asset), uint256(amount), uint256(to));
            return false;
		}

		TransferOut(asset, to, amount);

		return true;
	}
}