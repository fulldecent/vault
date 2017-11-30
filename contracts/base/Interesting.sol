pragma solidity ^0.4.18;

import "./InterestHelper.sol";
import "./Owned.sol";

/**
  * @title The Compound Interest Rate Contract
  * @author Compound
  * @notice Interest rate contract is a simple contract to keep track of interest rates.
  */

contract Interesting is InterestHelper, Owned {

	// Track assets -> rates
	mapping(address => uint64) rates;

	event InterestRateChange(address asset, uint64 interestRateBPS);

	/**
      * @notice `setInterestRate` sets the interest rate for a given asset
      * @param asset The asset to set the interest rate for
      * @param interestRateBPS The annual interest rate (APR) in basis points
      */
    function setInterestRate(address asset, uint64 interestRateBPS) public onlyOwner {
        InterestRateChange(asset, interestRateBPS);

        rates[asset] = interestRateBPS;
    }

    /**
      * @notice `getInterestRate` returns the interest rate for given asset
      * @param asset The asset to get the interest rate for
      * @return rate The annual interest rate (APR) in basis points
      */
    function getInterestRate(address asset) public view returns (uint64) {
        return rates[asset];
    }
}