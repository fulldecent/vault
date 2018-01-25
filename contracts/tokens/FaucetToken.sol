pragma solidity ^0.4.18;

import "./../base/StandardToken.sol";

/**
  * @title The Compound Faucet Test Token
  * @author Compound
  * @notice A simple token that lets anyone get more of it.
  */
contract FaucetToken is StandardToken {

    string constant public name = "Pig Token";
    string constant public symbol = "PIG";
    uint8 constant public decimals = 16;

	/**
	  * @notice Arbitrarily adds tokens to account
	  * @dev This is just for testing!
	  * @param _owner Acount to add tokens to.
	  * @param value Amount to add
	  */
	function allocate(address _owner, uint256 value) public {
		balances[_owner] += value;
		totalSupply += value;
		Transfer(address(this), _owner, value);
	}
}
