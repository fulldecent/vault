pragma solidity ^0.4.18;

/**
  * @title Interest Helper Contract
  * @author Compound
  * @notice This contract holds the compound interest calculation functions
  *			to be used by Compound contracts.
  */
contract InterestHelper {

	/**
      * @notice `balanceWithInterest` returns the balance with
      *			compound interest over the given period.
      * @param principal The starting principal
      * @param beginTime The time (as an epoch) when interest began to accrue
      * @param endTime The time (as an epoch) when interest stopped accruing (e.g. now)
      * @param interestRateBPS The annual interest rate (APR)
      */
    function balanceWithInterest(uint256 principal, uint256 beginTime, uint256 endTime, uint64 interestRateBPS) public pure returns (uint256) {
uint256 duration = (endTime - beginTime) / (1 years);
    uint256 payouts = duration * 12;
    uint256 amortization = principal;

    for (uint64 _i = 0; _i < payouts; _i++) {
        amortization = amortization + ((amortization * interestRateBPS / 100) / 100 / 12);
    }

    return amortization;
  }

  /**
      * @notice `compoundedInterest` returns compounded interest over the given period.
      * @param principal The starting principal
      * @param beginTime The time (as an epoch) when interest began to accrue
      * @param endTime The time (as an epoch) when interest stopped accruing (e.g. now)
      * @param interestRateBPS The annual interest rate (APR)
      */
    function compoundedInterest(uint256 principal, uint256 beginTime, uint256 endTime, uint64 interestRateBPS) public pure returns (uint256) {
        return balanceWithInterest(principal, beginTime, endTime, interestRateBPS) - principal;
    }
}
