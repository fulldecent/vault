pragma solidity ^0.4.18;

import "./InterestRateStorage.sol";

// TODO: Natspec
contract BorrowInterestRateStorage is InterestRateStorage {
	function BorrowInterestRateStorage(uint8 blockScale_) InterestRateStorage(blockScale_) public {}
}