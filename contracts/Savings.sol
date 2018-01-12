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
        return getDepositBalanceAt(
            customer,
            asset,
            now);
    }

    /**
      * @notice `getDepositBalanceAt` returns the balance (with interest) for
      *         the given customer in the given asset (e.g. W-Eth or OMG)
      * @param customer The customer
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      * @return The balance (with interest)
      */
    function getDepositBalanceAt(address customer, address asset, uint256 timestamp) public view returns (uint256) {
        return balanceWithInterest(
            ledgerStorage.getBalance(customer, uint8(LedgerAccount.Deposit), asset),
            ledgerStorage.getBalanceTimestamp(customer, uint8(LedgerAccount.Deposit), asset),
            timestamp,
            interestRateStorage.getInterestRate(asset));
    }

    /**
      * @notice `accrueDepositInterest` accrues any current interest on an
      *         savings account.
      * @param customer The customer
      * @param asset The asset to accrue savings interest on
      * @return success or failure
      */
    function accrueDepositInterest(address customer, address asset) public returns (bool) {
        if (!checkInterestRateStorage()) {
            return false;
        }

        uint timestamp = ledgerStorage.getBalanceTimestamp(customer, uint8(LedgerAccount.Deposit), asset);

        if (timestamp != 0) {
            uint interest = compoundedInterest(
                ledgerStorage.getBalance(customer, uint8(LedgerAccount.Deposit), asset),
                timestamp,
                now,
                interestRateStorage.getInterestRate(asset));

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
}
