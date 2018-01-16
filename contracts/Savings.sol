pragma solidity ^0.4.18;

import "./Ledger.sol";
import "./base/Owned.sol";
import "./base/Graceful.sol";
import "./base/InterestHelper.sol";
import "./base/Token.sol";
import "./storage/TokenStore.sol";

/**
  * @title The Compound Savings Account
  * @author Compound
  * @notice A Savings account allows functions for customer deposits and withdrawals.
  */
contract Savings is Graceful, Owned, Ledger, InterestHelper {
    TokenStore public tokenStore;
    uint8 public savingsRateSlopeBPS = 100;
    InterestRateStorage public savingsInterestRateStorage;

    /**
      * @notice `setTokenStore` sets the token store contract
      * @dev This is for long-term token storage (TODO: Test)
      * @param tokenStoreAddress The contract which acts as the long-term token store
      * @return Success of failure of operation
      */
    function setTokenStore(address tokenStoreAddress) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        tokenStore = TokenStore(tokenStoreAddress);

        return true;
    }

    /**
      * @notice `checkTokenStore` verifies token store has been set
      * @return True if token store is initialized, false otherwise
      */
    function checkTokenStore() internal returns (bool) {
        if (tokenStore == address(0)) {
            failure("Savings::TokenStoreUnitialized");
            return false;
        }

        return true;
    }

    /**
      * @notice `setSavingsInterestRateStorage` sets the interest rate storage location for this savings contract
      * @dev This is for long-term data storage (TODO: Test)
      * @param savingsInterestRateStorage_ The contract which acts as the long-term data store
      * @return Success of failure of operation
      */
    function setSavingsInterestRateStorage(InterestRateStorage savingsInterestRateStorage_) public returns (bool) {
        if (!checkOwner()) {
            return false;
        }

        savingsInterestRateStorage = savingsInterestRateStorage_;

        return true;
    }

    /**
      * @notice `checkSavingsInterestRateStorage` verifies interest rate store has been set
      * @return True if interest rate store is initialized, false otherwise
      */
    function checkSavingsInterestRateStorage() internal returns (bool) {
        if (savingsInterestRateStorage == address(0)) {
            failure("Savings::InterestRateStorageUnitialized");
            return false;
        }

        return true;
    }

    /**
      * @notice `customerDeposit` deposits a given asset in a customer's savings account.
      * @param asset Asset to deposit
      * @param amount The amount of asset to deposit
      * @param from The customer's account which is pre-authorized for transfer
      * @return success or failure
      */
    function customerDeposit(address asset, uint256 amount, address from) public returns (bool) {
        // TODO: Should we verify that from matches `msg.sender` or `msg.originator`?
        if (!checkTokenStore()) {
            return false;
        }

        if (!checkSavingsInterestRateStorage()) {
            return false;
        }

        // Transfer `tokenStore` the asset from `from`
        if (!Token(asset).transferFrom(from, address(tokenStore), amount)) {
            failure("Savings::TokenTransferFromFail", uint256(asset), uint256(amount), uint256(from));
            return false;
        }

        if (!accrueDepositInterest(from, asset)) {
            return false;
        }

        debit(LedgerReason.CustomerDeposit, LedgerAccount.Cash, from, asset, amount);
        credit(LedgerReason.CustomerDeposit, LedgerAccount.Deposit, from, asset, amount);

        return true;
    }

    /**
      * @notice `customerWithdraw` withdraws a given amount from an customer's balance.
      * @param asset Asset type to withdraw
      * @param amount amount to withdraw
      * @param to address to withdraw to
      * @return success or failure
      */
    function customerWithdraw(address asset, uint256 amount, address to) public returns (bool) {
        if (!checkTokenStore()) {
            return false;
        }

        if (!checkSavingsInterestRateStorage()) {
            return false;
        }

        if (!accrueDepositInterest(msg.sender, asset)) {
            return false;
        }

        uint256 balance = getBalance(msg.sender, LedgerAccount.Deposit, asset);
        if (amount > balance) {
            failure("Savings::InsufficientBalance", uint256(asset), uint256(amount), uint256(to), uint256(balance));
            return false;
        }

        debit(LedgerReason.CustomerWithdrawal, LedgerAccount.Deposit, msg.sender, asset, amount);
        credit(LedgerReason.CustomerWithdrawal, LedgerAccount.Cash, msg.sender, asset, amount);

        // Transfer asset out to `to` address
        if (!tokenStore.transferAssetOut(asset, to, amount)) {
            // TODO: We've marked the debits and credits, maybe we should reverse those?
            failure("Savings::TokenTransferToFail", uint256(asset), uint256(amount), uint256(to), uint256(balance));
            return false;
        }

        return true;
    }

    /**
      * @notice `getDepositBalance` returns the balance (with interest) for
      *         the given account in the given asset (e.g. W-Eth or OMG)
      * @param customer The customer
      * @param asset The asset to check the balance of
      * @return The balance (with interest)
      */
    function getDepositBalance(address customer, address asset) public view returns (uint256) {
        return savingsInterestRateStorage.getCurrentBalance(
            asset,
            ledgerStorage.getBalanceBlockNumber(customer, uint8(LedgerAccount.Deposit), asset),
            ledgerStorage.getBalance(customer, uint8(LedgerAccount.Deposit), asset)
        );
    }

    /**
      * @notice `accrueDepositInterest` accrues any current interest on an
      *         savings account.
      * @param customer The customer
      * @param asset The asset to accrue savings interest on
      * @return success or failure
      */
    function accrueDepositInterest(address customer, address asset) public returns (bool) {
        if (!checkSavingsInterestRateStorage()) {
            return false;
        }

        uint blockNumber = ledgerStorage.getBalanceBlockNumber(customer, uint8(LedgerAccount.Deposit), asset);

        if (blockNumber != block.number) {
            // We need to true up balance

            uint balanceWithInterest = getDepositBalance(customer, asset);
            uint balanceLessInterest = ledgerStorage.getBalance(customer, uint8(LedgerAccount.Deposit), asset);

            if (balanceWithInterest - balanceLessInterest > balanceWithInterest) {
                // Interest should never be negative
                failure("Savings::InterestUnderflow", uint256(asset), uint256(customer), balanceWithInterest, balanceLessInterest);
                return false;
            }

            uint interest = balanceWithInterest - balanceLessInterest;

            if (interest != 0) {
                debit(LedgerReason.Interest, LedgerAccount.InterestExpense, customer, asset, interest);
                credit(LedgerReason.Interest, LedgerAccount.Deposit, customer, asset, interest);
                if (!ledgerStorage.saveCheckpoint(customer, uint8(LedgerAccount.Deposit), asset)) {
                    revert();
                }
          }
        }

        return true;
    }

    /**
      * @notice `getSavingsInterestRateBPS` returns the current savings interest rate based on the balance sheet
      * @param asset address of asset
      * @return the current savings interest rate (in basis points)
      * TODO: Test
      */
    function getSavingsInterestRateBPS(address asset) public view returns (uint64) {
      uint256 cash = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Cash));
      uint256 deposits = ledgerStorage.getBalanceSheetBalance(asset, uint8(LedgerAccount.Deposit));

      // `deposit r` == (1-`reserve ratio`) * 10%
      return uint64( ( basisPointMultiplier  - ( ( basisPointMultiplier * cash ) / deposits ) ) * savingsRateSlopeBPS );
    }

    /**
      * @notice `snapshotSavingsInterstRate` snapshots the current interest rate for the block uint
      * @param asset address of asset
      * @return true on success, false if failure (e.g. snapshot already taken for this block uint)
      * TODO: Test
      */
    function snapshotSavingsInterstRate(address asset) public returns (bool) {
      uint64 rate = getSavingsInterestRateBPS(asset);

      return savingsInterestRateStorage.snapshotCurrentRate(asset, rate);
    }
}
