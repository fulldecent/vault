pragma solidity ^0.4.17;

contract Owned {
  /**
   * @title Owned Helper
   * @author Compound
   * @notice The owned contract provides a helper function which only allows the creator of the contract to call the function it's applied to.
   */
  function Owned() internal { owner = msg.sender; }
    address owner;

    // This contract only defines a modifier but does not use
    // it - it will be used in derived contracts.
    // The function body is inserted where the special symbol
    // "_;" in the definition of a modifier appears.
    // This means that if the owner calls this function, the
    // function is executed and otherwise, an exception is
    // thrown.

    /**
      * @dev `onlyOwner` functions may only be called by the creator of this contract.
    */
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function getOwner() public view returns(address) {
      return owner;
    }
}
