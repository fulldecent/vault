pragma solidity ^0.4.18;

import "./../base/StandardToken.sol";

/**
  * @title The Compound Pig Test Token
  * @author Compound
  * @notice A simple token to be used only in testing of contracts.
  */
contract PigToken is StandardToken {

	/**
	  * @notice Arbitrarily adds tokens to account
	  * @dev This is just for testing!
	  * @param _owner Acount to add tokens to.
	  * @param value Amount to add
	  */
	function allocate(address _owner, uint256 value) public {
		balances[_owner] += value;
		totalSupply += value;
	}
}