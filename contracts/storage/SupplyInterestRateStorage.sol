pragma solidity ^0.4.18;

import "./InterestRateStorage.sol";

/**
  * @title The Compound Interest Storage Rate Contract for Supplier
  * @author Compound
  * @notice See `contracts/storage/InterestRateStorage.sol`
  */
contract SupplyInterestRateStorage is InterestRateStorage {
	function SupplyInterestRateStorage(uint8 blockScale_) InterestRateStorage(blockScale_) public {}
}
