pragma solidity ^0.4.18;

import "./base/Owned.sol";

/**
  * @title The Compound Interest Calculator Contract
  * @author Compound
  * @notice This contract holds the math for calculating the current interest rates
  */
contract InterestCalculator {
    uint16 public supplyRateSlopeBPS = 1000;
    uint16 public borrowRateSlopeBPS = 2000;
    uint16 public minimumBorrowRateBPS = 1000;
    uint constant blocksPerYear = 2102400; // = (365 * 24 * 60 * 60) seconds per year / 15 seconds per block
    // Given a real number decimal, to convert it to basis points you multiply by 10000.
    // For example, we know 100 basis points = 1% = .01.  We get the basis points from the decimal: .01 * 10000 = 100
    uint16 basisPointMultiplier = 10000;
    uint constant interestRateScale = 10 ** 16;

    /**
      * @notice `getScaledBorrowRatePerGroup` returns the current borrow interest rate based on the balance sheet
      * @param cash total cash available of asset from balance sheet
      * @param borrows total borrows of asset from balance sheet
      * @return the current borrow interest rate (in scale points, aka divide by 10^16 to get real rate)
      */
    function getScaledBorrowRatePerGroup(uint256 cash, uint256 borrows) public view returns (uint64) {
        // avoid division by 0 without altering calculations in the happy path (at the cost of an extra comparison)
        uint256 denominator = cash + borrows;

        if (denominator == 0) {
            denominator = 1;
        }

        // `borrow r` == 10% + (1-`reserve ratio`) * 20%
        // note: this is done in one-line since intermediate results would be truncated
        return uint64( (minimumBorrowRateBPS + ( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / ( denominator ) ) ) * borrowRateSlopeBPS / basisPointMultiplier )  * (interestRateScale / (blocksPerYear * basisPointMultiplier)));
    }

    /**
      * @notice `getScaledSupplyRatePerGroup` returns the current borrow interest rate based on the balance sheet
      * @param cash total cash available of asset from balance sheet
      * @param borrows total borrows of asset from balance sheet
      * @return the current supply interest rate (in scale points, aka divide by 10^16 to get real rate)
      */
    function getScaledSupplyRatePerGroup(uint256 cash, uint256 borrows) public view returns (uint64) {
        // avoid division by 0 without altering calculations in the happy path (at the cost of an extra comparison)
        uint256 denominator = cash + borrows;

        if (denominator == 0) {
            denominator = 1;
        }

        // `supply r` == (1-`reserve ratio`) * 10%
        // note: this is done in one-line since intermediate results would be truncated
        // should scale 10**16 / basisPointMultiplier. Do the division by block units per year in int rate storage
        return uint64( (( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / ( denominator ) ) ) * supplyRateSlopeBPS / basisPointMultiplier) * (interestRateScale / (blocksPerYear * basisPointMultiplier)));
    }

}