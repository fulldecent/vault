pragma solidity ^0.4.18;

/**
  * @title Graceful Errors Contract
  * @author Compound
  * @notice This contract allows contract to fail with graceful error messages
  *         that include a success or failure flag.
  */
contract Graceful {
	event GracefulFailure(string errorMessage, uint256[] values);

	function failure(string errorMessage) internal returns (bool) {
		uint256[] memory values = new uint256[](0);

		GracefulFailure(errorMessage, values);

		return false;
	}

	function failure(string errorMessage, uint256 value0) internal returns (bool) {
		uint256[] memory values = new uint256[](1);
		values[0] = value0;

		GracefulFailure(errorMessage, values);

		return false;
	}

	function failure(string errorMessage, uint256 value0, uint256 value1) internal returns (bool) {
		uint256[] memory values = new uint256[](2);
		values[0] = value0;
		values[1] = value1;

		GracefulFailure(errorMessage, values);

		return false;
	}

	function failure(string errorMessage, uint256 value0, uint256 value1, uint256 value2) internal returns (bool) {
		uint256[] memory values = new uint256[](3);
		values[0] = value0;
		values[1] = value1;
		values[2] = value2;

		GracefulFailure(errorMessage, values);

		return false;
	}

	function failure(string errorMessage, uint256 value0, uint256 value1, uint256 value2, uint256 value3) internal returns (bool) {
		uint256[] memory values = new uint256[](4);
		values[0] = value0;
		values[1] = value1;
		values[2] = value2;
		values[3] = value3;

		GracefulFailure(errorMessage, values);

		return false;
	}
}