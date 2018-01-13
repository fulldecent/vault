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
	uint blockScale;

	function InterestRateStorage(uint8 blockScale_) {
		blockScale = blockScale_;
	}

	// Track assets -> daily interest rates
	mapping(address => uint64) public dailyInterestRates;

	struct Snapshot {
		uint64 blockUnit;
		uint64 dailyInterestRate;
		uint256 compoundedInterestRate;
	}

	// Snapshots map a timestamp to a "rate to date"
	mapping(address => uint64) public firstSnapshotBlockUnits;
	mapping(address => uint64) public lastSnapshotBlockUnits;
	mapping(address => mapping(uint64 => Snapshot)) public snapshots;

	event InterestRateChange(address asset, uint64 dailyInterestRate);
	event NewSnapshot(address asset, uint blockUnit, uint64 dailyInterestRate);

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
	  * @notice `getSnapshotDailyInterestRate` returns the daily interest rate of the first snapshot on or after the given block
	  * @param asset The asset which was snapshotted
	  * @param blockNumber The block number to get the snapshot for
	  * @return The daily interest rate of the first snapshot on or after the given block scaled up by `interestRateScale`
	  */
	function getSnapshotDailyInterestRate(address asset, uint256 blockNumber) public view returns (uint64) {
		return getSnapshot(asset, blockNumber).dailyInterestRate;
	}

	/**
	  * @notice `getCompoundedInterestRate` returns the compounded interest rate up until now of the first snapshot on or after the given time
	  * @param asset The asset which was snapshotted
	  * @param blockNumber The block number to get the snapshot for
	  * @return The compounded interest rate for this given asset since given block scaled up by `interestRateScale`
	  */
	function getCompoundedInterestRate(address asset, uint256 blockNumber) public view returns (uint256) {
		return getSnapshot(asset, blockNumber).compoundedInterestRate;
	}

	/**
	  * @notice `snapshotCurrentRate` takes a daily snapshot of a given asset's rate
	  * @param asset The asset to snapshot
	  * @dev This will fail if we have a current snapshot for the given block unit
	  * @dev Note: this is public and anyone can call it.
	  * @return Success or failure of given snapshot.
	  */
	function snapshotCurrentRate(address asset) public returns (bool) {
		uint64 firstSnapshotBlockUnit = firstSnapshotBlockUnits[asset];
		uint64 currentBlockUnit = getBlockUnit(block.number);
		uint64 rate = dailyInterestRates[asset];
		Snapshot storage existingSnapshot = snapshots[asset][currentBlockUnit];

		if (existingSnapshot.blockUnit > 0) {
			failure("InterestRateStorage::RateExists", existingSnapshot.blockUnit, existingSnapshot.dailyInterestRate, existingSnapshot.compoundedInterestRate);
			return false;
		}

		lastSnapshotBlockUnits[asset] = currentBlockUnit;

		snapshots[asset][currentBlockUnit] = Snapshot(
			currentBlockUnit,
			rate,
			interestRateScale
		);

		NewSnapshot(asset, currentBlockUnit, rate);

		if (firstSnapshotBlockUnit == 0) {
			firstSnapshotBlockUnits[asset] = currentBlockUnit;
		} else {
			for (uint64 blockUnit = currentBlockUnit - 1; blockUnit >= firstSnapshotBlockUnit; blockUnit--) {
				if (snapshots[asset][blockUnit].blockUnit == 0) {
					// Handle the case of filling in missing snapshots
					snapshots[asset][blockUnit] = Snapshot(
						blockUnit,
						snapshots[asset][blockUnit+1].dailyInterestRate,
						multiplyInterestRate(snapshots[asset][blockUnit+1].compoundedInterestRate, snapshots[asset][blockUnit+1].dailyInterestRate)
					);

					// Let's start compounding this rate as well.
					// TODO: This is right?
					rate = uint64(multiplyInterestRate(interestRateScale + snapshots[asset][blockUnit+1].dailyInterestRate, rate) - interestRateScale);
				} else {
					// Compound interest rate with current block unit's interest
					snapshots[asset][blockUnit].compoundedInterestRate = multiplyInterestRate(snapshots[asset][blockUnit].compoundedInterestRate, rate);
				}
			}
		}

		return true;
	}

	/**
	  * @notice `multiplyInterestRate` multiples the principal by a given interest rate which was scaled
	  * @param principal original amount to scale (may be an interest rate itself)
	  * @param interestRate the interest rate to apply
	  * @return principal times interest rate after scaling up and back down
	  */
	function multiplyInterestRate(uint256 principal, uint256 interestRate) private returns (uint256) {
		return ( ( interestRateScale + interestRate ) * principal ) / interestRateScale;
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
				dailyInterestRates[asset],
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
	  * @notice `setInterestRate` sets the daily interest rate for a given asset
	  * @param asset The asset to set the interest rate for
	  * @param dailyInterestRate The daily interest rate scaled to `scale` (10e16)
	  * @return success or failure
	  */
	function setInterestRate(address asset, uint64 dailyInterestRate) public returns (bool) {
		if (!checkOwner()) {
			return false;
		}

		dailyInterestRates[asset] = dailyInterestRate;

		InterestRateChange(asset, dailyInterestRate);

		return true;
	}

	/**
	  * @notice `getInterestRate` returns the interest rate for given asset
	  * @param asset The asset to get the interest rate for
	  * @return rate The daily interest rate scaled to `scale` (10e16)
	  */
	function getInterestRate(address asset) public view returns (uint64) {
		return dailyInterestRates[asset];
	}

}