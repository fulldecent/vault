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
      * @param interestRateInBasisPoints The annual interest rate in basis points (e.g. 1% = 100)
      * @param payoutsPerYear The number of payouts per year
      */
	function balanceWithInterest(uint256 principal, uint256 beginTime, uint256 endTime, uint64 interestRateInBasisPoints, uint64 payoutsPerYear) public pure returns (uint256) {

		uint256 duration = (endTime - beginTime);
		uint256 payouts = duration * payoutsPerYear / (1 years);

    // The formula below takes q and calculates with a base of `( 1 + 1/q )`
    // We want that to be ( 1 + r/n ) where r is interestRate and n is payouts per year
    // Thus, we want `1/q = r/n` or `q = n/r`. We also convert now from basis points to
    // a decimal.
    uint256 q = ( payoutsPerYear * 10000 ) / interestRateInBasisPoints;
    uint256 precision = 100;

    return fracExp(principal, q, payouts, precision);
	}

  // From https://ethereum.stackexchange.com/a/10432

  // Computes `k * (1+1/q) ^ n`, with precision `p`. The higher the precision,
  // the higher the gas cost. It should be something around the log of `n`.
  // When `p == n`, the precision is absolute (sans possible integer overflows).
  // Much smaller values are sufficient to get a great approximation.
  function fracExp(uint256 k, uint256 q, uint256 n, uint256 p) private pure returns (uint256) {
    uint256 s = 0;
    uint256 N = 1;
    uint256 B = 1;

    for (uint256 i = 0; i < p; ++i) {
      uint256 q_to_the_i = (q**i);

      // Short circuit if any divisor becomes 0 to prevent divide by zero
      if (B == 0 || q_to_the_i == 0) {
        return s;
      }

      s += k * N / B / q_to_the_i;
      N  = N * (n-i);
      B  = B * (i+1);
    }

    return s;
  }
}