pragma solidity ^0.4.19;

import "../base/Allowed.sol";
import "../base/Graceful.sol";

/**
  * @title The Compound Balance Sheet
  * @author Compound
  * @notice The Balance Sheet stores the value of each ledger account (e.g. Supplies, Borrows, Cash, etc.) for each asset
  */
contract BalanceSheet is Graceful, Allowed {

    // Balance Sheet is a map of LedgerAccount{Supply, Borrow, Cash, ...} -> asset -> balance
    mapping(uint8 => mapping(address => uint256)) balanceSheet;

    event BalanceSheetIncrease(uint8 ledgerAccount, address indexed asset, uint256 amount);
    event BalanceSheetDecrease(uint8 ledgerAccount, address indexed asset, uint256 amount);

    /**
      * @notice `increaseAccountBalance` increases the balance of a given ledger account
      * @param asset The asset which is being debited
      * @param ledgerAccount An integer representing a ledger account to debit
      * @return success or failure
      */
    function increaseAccountBalance(address asset, uint8 ledgerAccount, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        uint balanceSheetBalance = balanceSheet[ledgerAccount][asset];

        if (balanceSheetBalance + amount < balanceSheetBalance) {
            failure("BalanceSheet::BalanceSheetOverflow", uint256(asset), balanceSheetBalance, amount);
            return false;
        }

        balanceSheet[ledgerAccount][asset] = balanceSheetBalance + amount;

        BalanceSheetIncrease(ledgerAccount, asset, amount);

        return true;
    }

    /**
      * @notice `decreaseAccountBalance` reduces the balance of a given ledger account
      * @param asset The asset which is being credited
      * @param ledgerAccount An integer representing a ledger account to credit
      * @return success or failure
      */
    function decreaseAccountBalance(address asset, uint8 ledgerAccount, uint256 amount) public returns (bool) {
        if (!checkAllowed()) {
            return false;
        }

        uint balanceSheetBalance = balanceSheet[ledgerAccount][asset];

        if (balanceSheetBalance - amount > balanceSheetBalance) {
            failure("BalanceSheet::BalanceSheetUnderflow", uint256(asset), balanceSheetBalance, amount);
            return false;
        }

        balanceSheet[ledgerAccount][asset] = balanceSheetBalance - amount;

        BalanceSheetDecrease(ledgerAccount, asset, amount);

        return true;
    }

    /**
      * @notice `getBalanceSheetBalance` returns Compound's balance sheet balance of a ledger account
      * @param asset The asset to query the balance of
      * @param ledgerAccount An integer representing a ledger account to query
      * @return balance sheet's balance of given asset
      */
    function getBalanceSheetBalance(address asset, uint8 ledgerAccount) public view returns (uint256) {
        return balanceSheet[ledgerAccount][asset];
    }
}
