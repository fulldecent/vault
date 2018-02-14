pragma solidity ^0.4.18;

/**
  * @title Test Contract for Interest Model
  * @author Compound
  */
contract TestInterestModel {
    function getScaledSupplyRatePerBlock(uint256 supply, uint256 borrows) public view returns (uint64) {
        return uint64(supply * 10000 + borrows);
    }

    function getScaledBorrowRatePerBlock(uint256 supply, uint256 borrows) public view returns (uint64) {
        return uint64(borrows * 10000 + supply);
    }
}
