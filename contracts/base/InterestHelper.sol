pragma solidity ^0.4.18;

import "./Exponents.sol";

/**
  * @title Interest Helper Contract
  * @author Compound
  * @notice This contract holds the compound interest calculation functions
  *			to be used by Compound contracts.
  */
contract InterestHelper is Exponents {
    uint256 public constant E_NUMERATOR = 271828182846;
    uint256 public constant E_DENOMINATOR = 100000000000;
    uint32 public constant BASIS_POINTS_PER_UNIT = 10000;
	/**
      * @notice `balanceWithInterest` returns the balance with
      *			compound interest over the given period.
      * @param principal The starting principal
      * @param beginTime The time (as an epoch) when interest began to accrue
      * @param endTime The time (as an epoch) when interest stopped accruing (e.g. now)
      * @param interestRateBPS The annual interest rate (APR)
      */
    function balanceWithInterest(uint256 principal, uint256 beginTime, uint256 endTime, uint64 interestRateBPS) public view returns (uint256) {
    if((endTime - beginTime) > 0) {
      uint256 multiplier;
      uint8 precision;

      // e^rt
      // where
      // r = (interest in basis points / basis points per unit)
      // t = (time in seconds / seconds in a year)
      (multiplier, precision) = power(
        E_NUMERATOR,
        E_DENOMINATOR,
        uint32((endTime-beginTime) * interestRateBPS / 1 years),
        BASIS_POINTS_PER_UNIT
      );
      return uint256((principal * multiplier) >> precision);
    } else {
      return principal;
    }
  }

  /**
      * @notice `compoundedInterest` returns compounded interest over the given period.
      * @param principal The starting principal
      * @param beginTime The time (as an epoch) when interest began to accrue
      * @param endTime The time (as an epoch) when interest stopped accruing (e.g. now)
      * @param interestRateBPS The annual interest rate (APR)
      */
    function compoundedInterest(uint256 principal, uint256 beginTime, uint256 endTime, uint64 interestRateBPS) public view returns (uint256) {
        return balanceWithInterest(principal, beginTime, endTime, interestRateBPS) - principal;
    }
}
