pragma solidity ^0.4.18;

import "../base/Allowed.sol";
import "../base/Graceful.sol";

/**
  * @title The Compound Ledger Storage Contract
  * @author Compound
  * @notice The Ledger Storage contract is a simple contract to keep track of ledger entries.
  */
contract LedgerStorage is Graceful, Allowed {
    uint constant interestRateScale = 10 ** 16;
    uint16 public supplyRateSlopeBPS = 1000;
    uint16 public borrowRateSlopeBPS = 2000;
    uint16 public minimumBorrowRateBPS = 1000;

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 blockNumber;
        uint64  interestRateBPS;
        uint256 nextPaymentDate;
    }

    event BalanceIncrease(address indexed customer, uint8 ledgerAccount, address indexed asset, uint256 amount);
    event BalanceDecrease(address indexed customer, uint8 ledgerAccount, address indexed asset, uint256 amount);

    // A map of customer -> LedgerAccount{Supply, Borrow} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    // Balance Sheet is a map of LedgerAccount{Supply, Borrow} -> asset -> balance
    mapping(uint8 => mapping(address => uint256)) balanceSheet;

    // Block interest map is a map of LedgerAccount{Supply, Borrow} -> block number -> total interest
    // Total interest is the total interest accumlated since the beginning of time
    mapping(uint8 => mapping(uint256 => uint256)) blockInterest;
    uint256 blockInterestBlock;

    /**
      * @notice `increaseBalanceByAmount` increases a balances account by a given amount
      * @param customer The customer whose account to increase
      * @param ledgerAccount An integer representing a ledger account to increase
      * @param asset The asset to increase the balance of
      * @param amount The amount to increase the balance
      * @return success or failure of operation
      */
    function increaseBalanceByAmount(address customer, uint8 ledgerAccount, address asset, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];
        uint balanceSheetBalance = balanceSheet[ledgerAccount][asset];

        if (checkpoint.balance + amount < checkpoint.balance) {
            failure("LedgerStorage::BalanceOverflow", uint256(customer), uint256(asset), checkpoint.balance, amount);
            return false;
        }

        if (balanceSheetBalance + amount < balanceSheetBalance) {
            failure("LedgerStorage::BalanceSheetOverflow", uint256(asset), balanceSheetBalance, amount);
            return false;
        }

        saveBlockInterest(ledgerAccount, asset);

        balanceSheet[ledgerAccount][asset] = balanceSheetBalance + amount;
        checkpoint.balance += amount;

        BalanceIncrease(customer, ledgerAccount, asset, amount);

        return true;
    }

    /**
      * @notice `decreaseBalanceByAmount` reduces a balances account by a given amount
      * @param customer The customer whose account to reduce
      * @param ledgerAccount An integer representing a ledger account to reduce
      * @param asset The asset to reduce the balance of
      * @param amount The amount to reduce the balance
      * @return success or failure of operation
      */
    function decreaseBalanceByAmount(address customer, uint8 ledgerAccount, address asset, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];
        uint balanceSheetBalance = balanceSheet[ledgerAccount][asset];

        if (checkpoint.balance - amount > checkpoint.balance) {
            failure("LedgerStorage::InsufficientBalance", uint256(customer), uint256(asset), checkpoint.balance, amount);
            return false;
        }

        if (balanceSheetBalance - amount > balanceSheetBalance) {
            failure("LedgerStorage::BalanceSheetUnderflow", uint256(asset), balanceSheetBalance, amount);
            return false;
        }

        saveBlockInterest(ledgerAccount, asset);

        balanceSheet[ledgerAccount][asset] = balanceSheetBalance - amount;
        checkpoint.balance -= amount;

        BalanceDecrease(customer, ledgerAccount, asset, amount);

        return true;
    }

    /**
      * @notice `getBalanceSheetBalance` returns Compound's balance sheet balance of a ledger account
      * @param asset The asset to query the balance of
      * @param ledgerAccount An integer representing a ledger account to query
      * @return balance sheet's balance of given asset
      * TODO: Test
      */
    function getBalanceSheetBalance(address asset, uint8 ledgerAccount) public view returns (uint256) {
        return balanceSheet[ledgerAccount][asset];
    }

    /**
      * @notice `getBalance` returns the given customer's balance of an asset in an account
      * @param customer The customer whose account to query
      * @param ledgerAccount An integer representing a ledger account to query
      * @param asset The asset to query the balance of
      * @return balance of given asset
      */
    function getBalance(address customer, uint8 ledgerAccount, address asset) public view returns (uint256) {
        return balanceCheckpoints[customer][ledgerAccount][asset].balance;
    }

    /**
      * @notice `getBalanceBlockNumber` returns the block number of the given customer's balance checkpoint
      * @dev Block numbers are used to notify us that we haven't updated interest since this time.
      * @param customer The customer whose account to query
      * @param ledgerAccount An integer representing a ledger account to query
      * @param asset The asset to query the block number of
      * @return block number of given asset's balance checkpoint
      */
    function getBalanceBlockNumber(address customer, uint8 ledgerAccount, address asset) public view returns (uint256) {
        return balanceCheckpoints[customer][ledgerAccount][asset].blockNumber;
    }

    /**
      * @notice Saves a balance checkpoint
      * @param customer The customer to checkpoint
      * @param ledgerAccount Which ledger account to checkpoint
      * @param asset The asset which is being checkpointed
      */
    function saveCheckpoint(address customer, uint8 ledgerAccount, address asset) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][ledgerAccount][asset];
        checkpoint.blockNumber = block.number;

        return true;
    }

    function getCurrentBalance(uint8 ledgerAccount, address asset, address customer) public returns (uint256) {
        // uint256 startingBlock, uint256 endingBlock
        uint256 staringBlock = getBalanceBlockNumber(customer, uint8(ledgerAccount), asset);
        uint256 principal = getBalance(customer, uint8(ledgerAccount), asset)
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

    function saveBlockInterest(uint8 ledgerAccount, address asset) internal {
        uint256 totalInterest;

        // Take current interest rate
        uint64 currentInterestRate = getInterestRate(ledgerAccount, asset);

        // Grab last snapshot
        uint256 currentBlockInterestBlock = blockInterestBlock[ledgerAccount][asset];

        if (currentBlockInterestBlock == 0) {
            // There is no current snapshot, so let's start with a base multiplier
            totalInterest = interestRateScale;
        } else {
            // Let's apply interest since last block to current
            uint256 blocksSincePrevious = block.number - currentBlockInterestBlock;
            uint256 previousTotalInterest = blockInterest[ledgerAccount][asset][currentBlockInterestBlock];

            // Finally calculate a new total interest (which is previous * currentInterestRate * # blocks)
            totalInterest = multiplyInterestRate(previousTotalInterest, currentInterestRate * blocksSincePrevious);
        }

        blockInterest[ledgerAccount][asset][block.number] = totalInterest;
        blockInterestBlock[ledgerAccount][asset] = block.number;
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

    function getInterestRate(uint8 ledgerAccount, address asset) public returns (uint64) {
        // First, calculate the current interest rate
        if (ledgerAccount == LedgerAccount.Borrow) {
            return getScaledBorrowRatePerGroup(asset);
        } else if (ledgerAccount == LedgerAccount.Supply) {
            return getScaledSupplyRatePerGroup(asset);
        } else {
            return 0; // No effect
        }
    }

    /**
      * @notice `getScaledBorrowRatePerGroup` returns the current borrow interest rate based on the balance sheet
      * @param asset address of asset
      * @return the current borrow interest rate (in scale points, aka divide by 10^16 to get real rate)
      */
    function getScaledBorrowRatePerGroup(address asset) public view returns (uint64) {
        uint256 cash = getBalanceSheetBalance(asset, uint8(LedgerAccount.Cash));
        uint256 borrows = getBalanceSheetBalance(asset, uint8(LedgerAccount.Borrow));

        // avoid division by 0 without altering calculations in the happy path (at the cost of an extra comparison)
        uint256 denominator = cash + borrows;

        if (denominator == 0) {
            denominator = 1;
        }

        // `borrow r` == 10% + (1-`reserve ratio`) * 20%
        // note: this is done in one-line since intermediate results would be truncated
        return uint64( (minimumBorrowRateBPS + ( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / ( denominator ) ) ) * borrowRateSlopeBPS / basisPointMultiplier )  * (interestRateScale / basisPointMultiplier));
    }

    /**
      * @notice `getScaledSupplyRatePerGroup` returns the current borrow interest rate based on the balance sheet
      * @param asset address of asset
      * @return the current supply interest rate (in scale points, aka divide by 10^16 to get real rate)
      */
    function getScaledSupplyRatePerGroup(address asset) public view returns (uint64) {
        uint256 cash = getBalanceSheetBalance(asset, uint8(LedgerAccount.Cash));
        uint256 borrows = getBalanceSheetBalance(asset, uint8(LedgerAccount.Borrow));

        // avoid division by 0 without altering calculations in the happy path (at the cost of an extra comparison)
        uint256 denominator = cash + borrows;
        if (denominator == 0) {
            denominator = 1;
        }

        // `supply r` == (1-`reserve ratio`) * 10%
        // note: this is done in one-line since intermediate results would be truncated
        // should scale 10**16 / basisPointMultiplier. Do the division by block units per year in int rate storage
        return uint64( (( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / ( denominator ) ) ) * supplyRateSlopeBPS / basisPointMultiplier) * (interestRateScale / basisPointMultiplier));
    }
}