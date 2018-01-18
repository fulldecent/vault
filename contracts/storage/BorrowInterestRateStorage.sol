pragma solidity ^0.4.18;

import "./InterestRateStorage.sol";

/**
  * @title The Compound Interest Storage Rate Contract for Borrowing
  * @author Compound
  * @notice See `contracts/storage/InterestRateStorage.sol`
  */
contract BorrowInterestRateStorage is InterestRateStorage {
	function BorrowInterestRateStorage(uint8 blockScale_) InterestRateStorage(blockScale_) public {}
}