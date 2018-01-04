pragma solidity ^0.4.18;

import "./Graceful.sol";
import "./Owned.sol";

contract Allowed is Graceful, Owned {
	address allowed = address(0);

	// TODO: Test
	function allow(address _allowed) returns (bool) {
		if (!checkOwner()) {
			return false;
		}

		allowed = _allowed;

		return true;
	}

	// TODO: Test
	function checkAllowed() returns (bool) {
		if (msg.sender != allowed) {
			failure("Not allowed", uint256(msg.sender), uint256(allowed));
			return false;
		}

		return true;
	}
}
