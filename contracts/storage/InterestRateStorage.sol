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
	uint constant blocksPerYear = 2102400; // = (365 * 24 * 60 * 60) seconds per year / 15 seconds per block

	// the number of blocks in a single interest rate period.
	uint blockScale;

	uint blockUnitsPerYear;

	/* @param blockScale_ is the number of blocks that constitutes an interest rate period
	*/
	function InterestRateStorage(uint8 blockScale_) public {
		blockScale = blockScale_;

		blockUnitsPerYear = blocksPerYear/blockScale;
	}

	struct Snapshot {
		uint64 blockUnit;
		uint64 blockUnitInterestRate; // log_2(10**16) ~= 53, meaning we have around 11 bits before the decimal
		uint256 compoundedInterestRate;
	}

	// Snapshots map a timestamp to a "rate to date"
	mapping(address => uint64) public firstSnapshotBlockUnits;
	mapping(address => uint64) public lastSnapshotBlockUnits;
	mapping(address => mapping(uint64 => Snapshot)) public snapshots;

	event NewSnapshot(address asset, uint blockUnit, uint64 blockUnitInterestRate);

    function getInterestRateScale() public pure returns (uint)  {
        return interestRateScale;
    }

    function getBlockUnitsPerYear() public view returns (uint) {
        return blockUnitsPerYear;
    }

    /**
      * @notice `getSnapshotBlockNumber` returns the block number of the first snapshot on or after the given time
      * @param asset The asset which was snapshotted
      * @param blockNumber The block number to get the snapshot for
      * @return The block unit of the first snapshot on or after the given block
      */
	function getSnapshotBlockUnit(address asset, uint256 blockNumber) public view returns (uint64) {
		return getSnapshot(asset, blockNumber).blockUnit;
	}

	/**
	  * @notice `getSnapshotBlockUnitInterestRate` returns the block unit interest rate of the first snapshot on or after the given block
	  * @param asset The asset which was snapshotted
	  * @param blockNumber The block number to get the snapshot for
	  * @return The block unit interest rate of the first snapshot on or after the given block, scaled up by `interestRateScale`
	  */
	function getSnapshotBlockUnitInterestRate(address asset, uint256 blockNumber) public view returns (uint64) {
		return getSnapshot(asset, blockNumber).blockUnitInterestRate;
	}

	/**
	  * @notice `getCompoundedInterestRate` returns the compounded interest rate up until now of the first snapshot on or after the given time
	  * @param asset The asset which was snapshotted
	  * @param blockNumber The block number to get the snapshot for
	  * @return The compounded interest rate for this given asset since given block, scaled up by `interestRateScale`
	  */
	function getCompoundedInterestRate(address asset, uint256 blockNumber) public view returns (uint256) {
		return getSnapshot(asset, blockNumber).compoundedInterestRate;
	}

	/**
	  * @notice `getCurrentBalance` returns the princiapl with compounded interest rate up until now applied
	  * @param asset The asset which was snapshotted
	  * @param blockNumber The block number to get the snapshot for
	  * @param principal The starting principal before interest is to be applied
	  * @return The compounded interest rate applied for the given principal to bring that principal up to date
	  */
	function getCurrentBalance(address asset, uint256 blockNumber, uint256 principal) public view returns (uint256) {
		uint256 compoundedInterestRate = getCompoundedInterestRate(asset, blockNumber);

		return ( compoundedInterestRate * principal ) / interestRateScale;
	}

	/**
	  * @notice `snapshotCurrentRate` takes a block unit snapshot of a given asset's rate
	  * @param asset The asset to snapshot
	  * @param scaledPerGroupRate The interest rate to snapshot.  THIS SHOULD COME IN SCALED BY interestRateScale. in python: scaled_group_rate = ((group_rate_bps * interest_rate_scale)/basis_points_multiplier).quantize(0, rounding=ROUND_FLOOR)
	  * @dev This will fail if we have a current snapshot for the given block unit
	  * @dev Note: this is public and anyone can call it.
	  * @return Success or failure of given snapshot.
	  */
	function snapshotCurrentRate(address asset, uint64 scaledPerGroupRate) public returns (bool) {
		if (!checkAllowed()) {
            return false;
        }

		uint64 firstSnapshotBlockUnit = firstSnapshotBlockUnits[asset];
		uint64 currentBlockUnit = getBlockUnit(block.number);
		Snapshot storage existingSnapshot = snapshots[asset][currentBlockUnit];

		if (existingSnapshot.blockUnit > 0) {
			failure("InterestRateStorage::RateExists", existingSnapshot.blockUnit, existingSnapshot.blockUnitInterestRate, existingSnapshot.compoundedInterestRate);
			return false;
		}

		lastSnapshotBlockUnits[asset] = currentBlockUnit;

		snapshots[asset][currentBlockUnit] = Snapshot(
			currentBlockUnit, // blockUnit
			scaledPerGroupRate, // blockUnitInterestRate
			interestRateScale // compoundedInterestRate
		);

		NewSnapshot(asset, currentBlockUnit, scaledPerGroupRate);

		if (firstSnapshotBlockUnit == 0) {
			firstSnapshotBlockUnits[asset] = currentBlockUnit;
		} else {
			for (uint64 blockUnit = currentBlockUnit - 1; blockUnit >= firstSnapshotBlockUnit; blockUnit--) {
				if (snapshots[asset][blockUnit].blockUnit == 0) {
					// Handle the case of filling in missing snapshots
					snapshots[asset][blockUnit] = Snapshot(
						blockUnit,
						snapshots[asset][blockUnit+1].blockUnitInterestRate,
						multiplyInterestRate(snapshots[asset][blockUnit+1].compoundedInterestRate, snapshots[asset][blockUnit+1].blockUnitInterestRate)
					);

					// Let's start compounding this rate as well.
					// TODO: This is right?
					scaledPerGroupRate = uint64(multiplyInterestRate(interestRateScale + snapshots[asset][blockUnit+1].blockUnitInterestRate, scaledPerGroupRate) - interestRateScale);
				} else {
					// Compound interest rate with current block unit's interest
					snapshots[asset][blockUnit].compoundedInterestRate = multiplyInterestRate(snapshots[asset][blockUnit].compoundedInterestRate, scaledPerGroupRate);
				}
			}
		}

		return true;
	}

	/**
	  * @notice `getSnapshot` returns the given block unit's snapshot
	  * @param asset The asset to snapshot
	  * @param blockNumber The block number to get the snapshot for
	  * @return The snapshot for the given asset based on the block unit, or the first if block number is before the first snapshot
	  */
	function getSnapshot(address asset, uint256 blockNumber) internal view returns (Snapshot) {
		uint64 blockUnit = getBlockUnit(blockNumber);
		uint64 firstSnapshotBlockUnit = firstSnapshotBlockUnits[asset];
		uint64 lastSnapshotBlockUnit = lastSnapshotBlockUnits[asset];

		if (firstSnapshotBlockUnit == 0) {
			return Snapshot(
				0,
				0,
				interestRateScale); // No snapshotted interest
		}

		if (blockUnit < firstSnapshotBlockUnit) {
			blockUnit = firstSnapshotBlockUnit; // Start from first available block unit
		}

		if (blockUnit > lastSnapshotBlockUnit) {
			blockUnit = lastSnapshotBlockUnit; // Go to end if no further block units
		}

		return snapshots[asset][blockUnit];
	}

	/**
	  * @notice `getBlockUnit` returns the block unit associated with a given block number
	  * @param blockNumber The given block number
	  * @return The given block unit, which is the floor of `blockNumber / blockScale`
	  */
	function getBlockUnit(uint blockNumber) public view returns (uint64) {
		return uint64(blockNumber / blockScale);
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