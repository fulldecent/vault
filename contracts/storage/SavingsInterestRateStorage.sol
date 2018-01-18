pragma solidity ^0.4.18;

import "./InterestRateStorage.sol";

/**
  * @title The Compound Interest Storage Rate Contract for Savings
  * @author Compound
  * @notice See `contracts/storage/InterestRateStorage.sol`
  */
contract SavingsInterestRateStorage is InterestRateStorage {
	function SavingsInterestRateStorage(uint8 blockScale_) InterestRateStorage(blockScale_) public {}
}