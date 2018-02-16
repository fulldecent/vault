pragma solidity ^0.4.19;

/**
  * @title Array Helper Contract
  * @author Compound
  * @notice This contract includes some basic array functions which can
  * 		be used by inheriting contracts.
  */
contract ArrayHelper {

	/**
	  * @dev Determines whether or not array contains the given value, here defined as addresses.
	  * @param arr Array to check
	  * @param val Value to look for in `arr`
	  * @return found Whether or not the value `val` was found in `arr`
	  */
	function arrayContainsAddress(address[] arr, address val) public pure returns (bool) {
		for (uint64 i = 0; i < arr.length; i++) {
			if (arr[i] == val) {
				return true;
			}
		}

		return false;
	}

}