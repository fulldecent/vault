pragma solidity ^0.4.18;

import "../base/Owned.sol";
import "../base/Allowed.sol";

/**
  * @title The Compound Interest Storage Rate Contract
  * @author Compound
  * @notice Interest rate contract is a simple contract to keep track of interest rates.
  */
contract InterestRateStorage is Owned, Allowed {
	uint constant secondsPerDay = 86400;
	uint constant interestRateScale = 10 ** 16;

	// Track assets -> daily interest rates
	mapping(address => uint64) public dailyInterestRates;

	struct Snapshot {
		uint timestamp;
		uint64 dailyInterestRate;
		uint256 compoundedInterestRate;
	}

	// Snapshots map a timestamp to a "rate to date"
	mapping(address => uint32) public firstSnapshotDays;
	mapping(address => uint32) public lastSnapshotDays;
	mapping(address => mapping(uint32 => Snapshot)) public snapshots;

	event InterestRateChange(address asset, uint64 dailyInterestRate);
	event NewSnapshot(address asset, uint timestamp, uint64 dailyInterestRate);

	/**
	  * @notice `getSnapshotTimestamp` returns the timestamp of the first snapshot on or after the given time
	  * @param asset The asset which was snapshotted
	  * @param timestamp The timestamp to get the snapshot from
	  * @return The timestamp of the first snapshot on or after the given time
	  */
	function getSnapshotTimestamp(address asset, uint256 timestamp) public view returns (uint256) {
		return getSnapshot(asset, timestamp).timestamp;
	}

	/**
	  * @notice `getSnapshotDailyInterestRate` returns the daily interest rate of the first snapshot on or after the given time
	  * @param asset The asset which was snapshotted
	  * @param timestamp The timestamp to get the snapshot from
	  * @return The daily interest rate of the first snapshot on or after the given time scaled by `interestRateScale`
	  */
	function getSnapshotDailyInterestRate(address asset, uint256 timestamp) public view returns (uint64) {
		return getSnapshot(asset, timestamp).dailyInterestRate;
	}

	/**
	  * @notice `getCompoundedInterestRate` returns the compounded interest rate up until now of the first snapshot on or after the given time
	  * @param asset The asset which was snapshotted
	  * @param timestamp The timestamp to get the snapshot from
	  * @return The compounded interest rate for this given asset since timestamp scaled by `interestRateScale`
	  */
	function getCompoundedInterestRate(address asset, uint256 timestamp) public view returns (uint256) {
		return getSnapshot(asset, timestamp).compoundedInterestRate;
	}

	/**
	  * @notice `snapshotCurrentRate` takes a daily snapshot of a given asset's rate
	  * @param asset The asset to snapshot
	  * @dev This will fail if we have a current snapshot for the given day
	  * @dev Note: this is public and anyone can call it.
	  * @return Success or failure of given snapshot.
	  * TODO: Remove timestamp
	  */
	function snapshotCurrentRate(address asset, uint256 timestamp) public returns (bool) {
		uint32 firstSnapshotDay = firstSnapshotDays[asset];
		uint32 currentDay = getDay(timestamp);
		uint64 rate = dailyInterestRates[asset];
		Snapshot storage existingSnapshot = snapshots[asset][currentDay];

		if (existingSnapshot.timestamp > 0) {
			failure("InterestRateStorage::RateExists", existingSnapshot.timestamp, existingSnapshot.dailyInterestRate, existingSnapshot.compoundedInterestRate);
			return false;
		}

		lastSnapshotDays[asset] = currentDay;

		snapshots[asset][currentDay] = Snapshot(
			timestamp,
			rate,
			interestRateScale
		);

		NewSnapshot(asset, timestamp, rate);

		if (firstSnapshotDay == 0) {
			firstSnapshotDays[asset] = currentDay;
		} else {
			for (uint32 day = currentDay - 1; day >= firstSnapshotDay; day--) {
				if (snapshots[asset][day].timestamp == 0) {
					// Handle the case of filling in missing days
					snapshots[asset][day] = snapshots[asset][day+1];
				} else {
					// Compound interest rate with day
					snapshots[asset][day].compoundedInterestRate = ( ( interestRateScale + rate ) * snapshots[asset][day].compoundedInterestRate ) / interestRateScale;
				}
			}
		}

		return true;
	}

	/**
	  * @notice `getSnapshot` returns the given day's snapshot
	  * @param asset The asset to snapshot
	  * @param timestamp The timestamp to get the snapshot from
	  * @return The timestamp for the given asset based on the day, or the first if timestamp is before the first
	  */
	function getSnapshot(address asset, uint256 timestamp) internal view returns (Snapshot) {
		uint32 day = getDay(timestamp);
		uint32 firstSnapshotDay = firstSnapshotDays[asset];
		uint32 lastSnapshotDay = lastSnapshotDays[asset];

		if (firstSnapshotDay == 0) {
			return Snapshot(
				0,
				dailyInterestRates[asset],
				interestRateScale); // No snapshotted interest
		}

		if (day < firstSnapshotDay) {
			day = firstSnapshotDay; // Start from first available day
		}

		if (day > lastSnapshotDay) {
			day = lastSnapshotDay; // Go to end if no further days
		}

		return snapshots[asset][day];
	}

	/**
	  * @notice `getDay` returns the day associated with a given timestamp
	  * @param timestamp A timestamp
	  * @return The given day number of that timestamp (e.g. timestamp at Jan 1, 1970 = Day 0)
	  */
	function getDay(uint timestamp) public pure returns (uint32) {
		return uint32(timestamp / secondsPerDay);
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