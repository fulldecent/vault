pragma solidity ^0.4.18;

import "./InterestRateStorage.sol";

// TODO: Natspec
contract SavingsInterestRateStorage is InterestRateStorage {
	function SavingsInterestRateStorage(uint8 blockScale_) InterestRateStorage(blockScale_) public {}
}