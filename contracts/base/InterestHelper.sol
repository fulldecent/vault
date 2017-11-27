pragma solidity ^0.4.18;

/**
  * @title Interest Helper Contract
  * @author Compound
  * @notice This contract holds the compound interest calculation functions
  *			to be used by Compound contracts.
  */
contract InterestHelper {

  mapping(uint => uint) interestLookupTable;

  function InterestHelper() {
    interestLookupTable[1]    =    13671105; // 1 day
    interestLookupTable[10]    =  136795183; // 10 days
    interestLookupTable[3650] = 64700949769; // 10 years
  }
  /**
   * @notice `balanceWithInterest` returns the balance with
   * compound interest over the given period.
   * @param principal The starting principal
   * @param beginTime The time (as an epoch) when interest began to accrue
   * @param endTime The time (as an epoch) when interest stopped accruing (e.g. now)
   * @param interestRate The annual interest rate
   */
  function balanceWithInterest(uint256 principal, uint256 beginTime, uint256 endTime, uint64 interestRate) public view returns (uint256) {
    uint time = endTime - beginTime;
    return principal * (1 + interestLookupTable[time]);
  }

  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }
}
