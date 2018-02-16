pragma solidity ^0.4.19;

import "./Graceful.sol";
import "./Owned.sol";

contract Allowed is Graceful, Owned {
	address public allowed = address(0);

	// TODO: Test
	function allow(address _allowed) public returns (bool) {
		if (!checkOwner()) {
			return false;
		}

		allowed = _allowed;

		return true;
	}

	// TODO: Test
	function checkAllowed() public returns (bool) {
		if (msg.sender != allowed) {
			failure("Allowed::NotAllowed", uint256(msg.sender), uint256(allowed));
			return false;
		}

		return true;
	}
}
