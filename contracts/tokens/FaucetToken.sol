pragma solidity ^0.4.18;

import "./../base/Owned.sol";
import "./../base/StandardToken.sol";

/**
  * @title The Compound Faucet Test Token
  * @author Compound
  * @notice A simple token that lets anyone get more of it, with a cap on the amount that can be allocated per request
  */
contract FaucetToken is StandardToken, Owned {

	string constant public name = "Pig Token";
	string constant public symbol = "PIG";
	uint8 constant public decimals = 16;

	uint256 public perRequestTokenAmount;

	/**
	  * @notice Arbitrarily adds configured quantity of tokens to account of msg.sender
	  * @dev This is for automated testing and for convenience on the alpha test net
	  */
	function allocate() public returns (bool){

		if(perRequestTokenAmount == 0) {
			return failure("FaucetToken::AssetNotDisbursable");
		}

		return doAllocation(msg.sender, perRequestTokenAmount);
	}

	/**
	  * @notice Arbitrarily adds tokens to account
	  * @dev This is for automated testing and for convenience on the alpha test net
	  * @param recipient Account to add tokens to.
	  * @param value Amount to add
    */
	function allocateTo(address recipient, uint256 value) public returns (bool){

		if(!checkOwner()) {
			return false;
		}
		return doAllocation(recipient, value);
	}

	function doAllocation(address _owner, uint256 value) internal returns (bool) {
		balances[_owner] += value;
		totalSupply += value;
		Transfer(address(this), _owner, value);
		return true;
	}

	/**
	  * @notice `setPerRequestTokenAmount` allows the contract owner to set/update the amount given for each request of the specified token
	  * @dev This is for convenience on alpha test net
	  * @param amount How much of the token should be given out? Set to 0 to disallow allocations
	  * @return Success of failure of operation
	  */
	function setPerRequestTokenAmount(uint256 amount) public returns (bool) {
		if (!checkOwner()) {
			return false;
		}

		perRequestTokenAmount = amount;
		return true;
	}
}
