pragma solidity ^0.4.19;

import "./Graceful.sol";

contract Owned is Graceful {
    function Owned() internal { owner = msg.sender; }
    address owner;

    // This contract only defines a modifier but does not use
    // it - it will be used in derived contracts.
    // The function body is inserted where the special symbol
    // "_;" in the definition of a modifier appears.
    // This means that if the owner calls this function, the
    // function is executed and otherwise, a graceful exception is
    // thrown.
    modifier onlyOwner {
        if (msg.sender == owner) {
            _;
        } else {
            revert();
        }
    }

    function getOwner() public view returns(address) {
      return owner;
    }

    function checkOwner() internal returns (bool) {
        if (msg.sender == owner) {
            return true;
        } else {
            failure("Unauthorized", uint256(msg.sender), uint256(owner));
            return false;
        }
    }
}