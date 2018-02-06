pragma solidity ^0.4.18;

import "../base/Owned.sol";
import "../base/Allowed.sol";

/**
  * @title The Compound Interest Storage Rate Contract
  * @author Compound
  * @notice Interest rate contract is a simple contract to keep track of interest rates.
  */
contract InterestRateStorage is Owned, Allowed {
	uint constant interestRateScale = 10 ** 16;

    // Block interest map is a map of LedgerAccount{Supply, Borrow} -> asset -> block number -> total interest
    // Total interest is the total interest accumlated since the beginning of time
    mapping(uint8 => mapping(address => mapping(uint256 => uint256))) blockInterest;

    // Block interest block is a map of LedgerAccount{Supply, Borrow} -> asset -> most recent block number
    mapping(uint8 => mapping(address => uint256)) blockInterestBlock;

    // return ( compoundedInterestRate * principal ) / interestRateScale;

	function getCurrentBalance(uint8 ledgerAccount, address asset, uint256 startingBlock, uint256 principal) public view returns (uint256) {
        uint256 endingBlock = block.number;

        // Then, get the total interest rates which are stored.
        uint startingTotalInterest = blockInterest[ledgerAccount][asset][startingBlock];
        uint endingTotalInterest = blockInterest[ledgerAccount][asset][endingBlock];

        if (startingTotalInterest == 0 || endingTotalInterest == 0) {
            // This data must have been added previously
            revert();
        }

        return multiplyInterestRate(
            principal,
            endingTotalInterest - startingTotalInterest
        );
    }

    function saveBlockInterest(uint8 ledgerAccount, address asset, uint64 currentInterestRate) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        uint256 totalInterest;

        // Grab last snapshot
        uint256 currentBlockInterestBlock = blockInterestBlock[ledgerAccount][asset];

        if (currentBlockInterestBlock == 0) {
            // There is no current snapshot, so let's start with a base multiplier
            totalInterest = interestRateScale;
        } else if (currentBlockInterestBlock == block.number) {
            // Don't take a second snapshot
            return;
        } else {
            // Let's apply interest since last block to current
            uint256 blocksSincePrevious = block.number - currentBlockInterestBlock;
            uint256 previousTotalInterest = blockInterest[ledgerAccount][asset][currentBlockInterestBlock];

            // Finally calculate a new total interest (which is previous * currentInterestRate * # blocks)
            totalInterest = multiplyInterestRate(previousTotalInterest, currentInterestRate * blocksSincePrevious);
        }

        blockInterest[ledgerAccount][asset][block.number] = totalInterest;
        blockInterestBlock[ledgerAccount][asset] = block.number;

        return true;
    }

    /**
      * @notice `multiplyInterestRate` multiples the principal by a given interest rate which was scaled
      * @param principal original amount to scale (may be an interest rate itself)
      * @param interestRate the interest rate to apply
      * @return principal times interest rate after scaling up and back down
      */
    function multiplyInterestRate(uint256 principal, uint256 interestRate) pure private returns (uint256) {
        return ( ( interestRateScale + interestRate ) * principal ) / interestRateScale;
    }

}