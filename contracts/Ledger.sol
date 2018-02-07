pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./base/Graceful.sol";
import "./storage/LedgerStorage.sol";
import "./InterestModel.sol";
import "./storage/InterestRateStorage.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Graceful, Owned {
    LedgerStorage public ledgerStorage;
    InterestModel public interestModel;
    InterestRateStorage public interestRateStorage;

    enum LedgerReason {
        CustomerSupply,
        CustomerWithdrawal,
        Interest,
        CustomerBorrow,
        CustomerPayBorrow,
        CollateralPayBorrow
    }
    enum LedgerType { Debit, Credit }
    enum LedgerAccount {
        Cash,
        Borrow,
        Supply,
        InterestExpense,
        InterestIncome,
        Trading
    }

    event LedgerEntry(
        LedgerReason    ledgerReason,     // Ledger reason
        LedgerType      ledgerType,       // Credit or Debit
        LedgerAccount   ledgerAccount,    // Ledger account
        address         customer,         // Customer associated with entry
        address         asset,            // Asset associated with this entry
        uint256         amount,           // Amount of asset associated with this entry
        uint256         balance,          // Ledger account is Supply or Borrow, the new balance
        uint64          interestRateBPS,  // Interest rate in basis point if fixed
        uint256         nextPaymentDate); // Next payment date if associated with borrow

    /**
      * @notice `Ledger` tracks balances for a given customer by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice `setLedgerStorage` sets the ledger storage location for this contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param ledgerStorageAddress The contract which acts as the long-term data store
      * @return Success of failure of operation
      */
    function setLedgerStorage(address ledgerStorageAddress) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        ledgerStorage = LedgerStorage(ledgerStorageAddress);

        return true;
    }

    /**
      * @notice `setInterestModel` sets the interest helper for this contract
      * @param interestModelAddress The contract which acts as the interest model
      * @return Success of failure of operation
      */
    function setInterestModel(address interestModelAddress) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        interestModel = InterestModel(interestModelAddress);

        return true;
    }

    /**
      * @notice `setInterestRateStorage` sets the interest rate storage for this contract
      * @param interestRateStorageAddress The contract which acts as the interest rate storage
      * @return Success of failure of operation
      */
    function setInterestRateStorage(address interestRateStorageAddress) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        interestRateStorage = InterestRateStorage(interestRateStorageAddress);

        return true;
    }

    /**
      * @notice Debit a ledger account.
      * @param ledgerReason What caused this debit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Supply or Borrow)
      * @param customer The customer associated with this debit
      * @param asset The asset which is being debited
      * @param amount The amount to debit
      * @dev This throws on any error
      */
    function debit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
        if (!saveBlockInterest(asset, ledgerAccount)) {
            revert();
        }

        if(isAsset(ledgerAccount)) {
            if (!ledgerStorage.increaseBalanceByAmount(customer, uint8(ledgerAccount), asset, amount)) {
                revert();
            }
        } else if(isLiability(ledgerAccount)) {
            if (!ledgerStorage.decreaseBalanceByAmount(customer, uint8(ledgerAccount), asset, amount)) {
                revert();
            }
        } else {
            // Untracked ledger account
        }

        // Debit Entry
        LedgerEntry({
            ledgerReason: ledgerReason,
            ledgerType: LedgerType.Debit,
            ledgerAccount: ledgerAccount,
            customer: customer,
            asset: asset,
            amount: amount,
            balance: getBalance(customer, ledgerAccount, asset),
            interestRateBPS: 0,
            nextPaymentDate: 0
        });

        if (!ledgerStorage.saveCheckpoint(customer, uint8(ledgerAccount), asset)) {
            revert();
        }
    }

    /**
      * @notice Credit a ledger account.
      * @param ledgerReason What caused this credit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Supply or Borrow)
      * @param customer The customer associated with this credit
      * @param asset The asset which is being credited
      * @param amount The amount to credit
      * @dev This throws on any error
      */
    function credit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
        if (!saveBlockInterest(asset, ledgerAccount)) {
            revert();
        }

        if(isAsset(ledgerAccount)) {
            if (!ledgerStorage.decreaseBalanceByAmount(customer, uint8(ledgerAccount), asset, amount)) {
                revert();
            }
        } else if(isLiability(ledgerAccount)) {
            if (!ledgerStorage.increaseBalanceByAmount(customer, uint8(ledgerAccount), asset, amount)) {
                revert();
            }
        } else {
            // Untracked ledger account
        }

        // Credit Entry
        LedgerEntry({
            ledgerReason: ledgerReason,
            ledgerType: LedgerType.Credit,
            ledgerAccount: ledgerAccount,
            customer: customer,
            asset: asset,
            amount: amount,
            balance: getBalance(customer, ledgerAccount, asset),
            interestRateBPS: 0,
            nextPaymentDate: 0
        });

        if (!ledgerStorage.saveCheckpoint(customer, uint8(ledgerAccount), asset)) {
            revert();
        }
    }

    /**
      * @notice `getBalance` gets a customer's balance
      * @param customer the customer
      * @param ledgerAccount the ledger account
      * @return true if the account is an asset false otherwise
      */
    function getBalance(address customer, LedgerAccount ledgerAccount, address asset) internal view returns (uint) {
        return ledgerStorage.getBalance(customer, uint8(ledgerAccount), asset);
    }

    /**
      * @notice `isAsset` indicates if this account is the type that has an associated balance
      * @param ledgerAccount the account type (e.g. Supply or Borrow)
      * @return true if the account is an asset false otherwise
      */
    function isAsset(LedgerAccount ledgerAccount) private pure returns (bool) {
        return (
            ledgerAccount == LedgerAccount.Borrow
        );
    }

    /**
      * @notice `isLiability` indicates if this account is the type that has an associated balance
      * @param ledgerAccount the account type (e.g. Supply or Borrow)
      * @return true if the account is an asset false otherwise
      */
    function isLiability(LedgerAccount ledgerAccount) private pure returns (bool) {
        return (
            ledgerAccount == LedgerAccount.Supply
        );
    }

    // saveBlockInterest
    function saveBlockInterest(address asset, LedgerAccount ledgerAccount) internal returns (bool) {
        uint64 interestRate = getInterestRate(asset, ledgerAccount);

        if (interestRate > 0) {
            return interestRateStorage.saveBlockInterest(uint8(ledgerAccount), asset, interestRate);
        }

        return true;
    }

    /**
      * @notice `getInterestRate` returns the current interest rate for the given asset
      * @param asset The asset to query
      * @param ledgerAccount the account type (e.g. Supply or Borrow)
      * @return the interest rate scaled or something
      */
    function getInterestRate(address asset, LedgerAccount ledgerAccount) public view returns (uint64) {
        uint256 cash = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Cash));
        uint256 borrows = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Borrow));

        if (ledgerAccount == LedgerAccount.Borrow) {
            return interestModel.getScaledBorrowRatePerBlock(cash, borrows);
        } else if (ledgerAccount == LedgerAccount.Supply) {
            return interestModel.getScaledSupplyRatePerBlock(cash, borrows);
        } else {
            return 0;
        }
    }
}
