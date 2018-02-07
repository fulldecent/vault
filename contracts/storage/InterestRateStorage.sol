pragma solidity ^0.4.18;

import "../base/Owned.sol";
import "../base/Allowed.sol";

/**
  * @title The Compound Interest Storage Rate Contract
  * @author Compound
  * @notice Interest rate contract is a simple contract to keep track of interest rates.
  */
contract InterestRateStorage is Owned, Allowed {
	uint constant interestRateScale = 10 ** 17;

    // Block interest map is a map of LedgerAccount{Supply, Borrow} -> asset -> block number -> total interest
    // Total interest is the total interest accumlated since the beginning of time
    mapping(uint8 => mapping(address => mapping(uint256 => uint256))) public blockTotalInterest;

    // Block interest block is a map of LedgerAccount{Supply, Borrow} -> asset -> most recent block number
    mapping(uint8 => mapping(address => uint256)) public blockInterestBlock;

    // Block interest block is a map of LedgerAccount{Supply, Borrow} -> asset -> block number -> interest rate
    mapping(uint8 => mapping(address => mapping(uint256 => uint256))) public blockInterestRate;

    event Debug(uint256 startingBlock, uint256 endingBlock, uint256 principal, uint256 startingTotalInterest, uint256 endingTotalInterest);
    event TotalInterest(uint256 previousTotalInterest, uint256 currentInterestRate, uint256 blocksSincePrevious, uint256 totalInterest);

    function getCurrentBalance(uint8 ledgerAccount, address asset, uint256 startingBlock, uint256 principal) public view returns (uint256) {
        return getBalanceAt(ledgerAccount, asset, startingBlock, block.number, principal);
    }

    function getBalanceAt(uint8 ledgerAccount, address asset, uint256 startingBlock, uint256 endingBlock, uint256 principal) public returns (uint256) {
        // Then, get the total interest rates which are stored.
        uint startingTotalInterest = blockTotalInterest[ledgerAccount][asset][startingBlock];
        uint endingTotalInterest = blockTotalInterest[ledgerAccount][asset][endingBlock];

        if (startingTotalInterest == 0 || endingTotalInterest == 0) {
            // This data *must* have been added previously
            revert();
        }

        Debug(startingBlock, endingBlock, principal, startingTotalInterest, endingTotalInterest);

        return principal * endingTotalInterest / startingTotalInterest;
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
            return true;
        } else {
            // Let's apply interest since last block to current
            uint256 blocksSincePrevious = block.number - currentBlockInterestBlock;
            uint256 previousTotalInterest = blockTotalInterest[ledgerAccount][asset][currentBlockInterestBlock];
            uint256 previousBlockInterestRate = blockInterestRate[ledgerAccount][asset][currentBlockInterestBlock];

            // Finally calculate a new total interest (which is previous * currentInterestRate * # blocks)
            totalInterest = multiplyInterestRate(previousTotalInterest * blocksSincePrevious, previousBlockInterestRate);
            TotalInterest(previousTotalInterest, previousBlockInterestRate, blocksSincePrevious, totalInterest);
        }

        blockInterestBlock[ledgerAccount][asset] = block.number;
        blockInterestRate[ledgerAccount][asset][block.number] = currentInterestRate;
        blockTotalInterest[ledgerAccount][asset][block.number] = totalInterest;

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