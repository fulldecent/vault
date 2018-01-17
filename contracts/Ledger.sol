pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./base/Graceful.sol";
import "./storage/LedgerStorage.sol";
import "./storage/InterestRateStorage.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Graceful, Owned {
    LedgerStorage ledgerStorage;
    InterestRateStorage interestRateStorage;

    enum LedgerReason {
        CustomerDeposit,
        CustomerWithdrawal,
        Interest,
        CustomerBorrow,
        CustomerPayLoan,
        CollateralPayLoan
    }
    enum LedgerType { Debit, Credit }
    enum LedgerAccount {
        Cash,
        Loan,
        Deposit,
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
        uint256         balance,          // Ledger account is Deposit or Loan, the new balance
        uint64          interestRateBPS,  // Interest rate in basis point if fixed
        uint256         nextPaymentDate); // Next payment date if associated with loan

    /**
      * @notice `Ledger` tracks balances for a given customer by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice `setLedgerStorage` sets the ledger storage location for this contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param ledgerStorage_ The contract which acts as the long-term data store
      * @return Success of failure of operation
      */
    function setLedgerStorage(LedgerStorage ledgerStorage_) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        ledgerStorage = ledgerStorage_;

        return true;
    }

    /**
      * @notice `setInterestRateStorage` sets the interest rate storage location for this contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param interestRateStorage_ The contract which acts as the long-term data store
      * @return Success of failure of operation
      */
    function setInterestRateStorage(InterestRateStorage interestRateStorage_) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        interestRateStorage = interestRateStorage_;

        return true;
    }

    /**
      * @notice `checkInterestRateStorage` verifies interest rate store has been set
      * @return True if interest rate store is initialized, false otherwise
      */
    function checkInterestRateStorage() internal returns (bool) {
        if (interestRateStorage == address(0)) {
            failure("Ledger::InterestRateStorageUninitialized");
            return false;
        }

        return true;
    }

    /**
      * @notice Debit a ledger account.
      * @param ledgerReason What caused this debit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this debit
      * @param asset The asset which is being debited
      * @param amount The amount to debit
      * @dev This throws on any error
      */
    function debit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
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
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this credit
      * @param asset The asset which is being credited
      * @param amount The amount to credit
      * @dev This throws on any error
      */
    function credit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal {
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
      * @param ledgerAccount the account type (e.g. Deposit or Loan)
      * @return true if the account is an asset false otherwise
      */
    function isAsset(LedgerAccount ledgerAccount) private pure returns (bool) {
        return (
            ledgerAccount == LedgerAccount.Loan
        );
    }

    /**
      * @notice `isLiability` indicates if this account is the type that has an associated balance
      * @param ledgerAccount the account type (e.g. Deposit or Loan)
      * @return true if the account is an asset false otherwise
      */
    function isLiability(LedgerAccount ledgerAccount) private pure returns (bool) {
        return (
            ledgerAccount == LedgerAccount.Deposit
        );
    }
}
