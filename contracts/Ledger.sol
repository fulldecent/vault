pragma solidity ^0.4.18;

import "./base/Token.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Ledger
  * @author Compound
  * @notice Ledger keeps track of all balances of all asset types in Compound,
  *         as well as calculating Compound interest.
  */
contract Ledger is Owned {
    enum LedgerReason { CustomerDeposit, CustomerWithdrawal, Interest }
    enum LedgerType { Debit, Credit }
    enum LedgerAccount { Cash, Loan, Deposit, InterestExpense, InterestIncome }

    event LedgerEntry(
        LedgerReason    ledgerReason,     // Ledger reason
        LedgerType      ledgerType,       // Credit or Debit
        LedgerAccount   ledgerAccount,    // Ledger account
        address         customer,         // Customer associated with entry
        address         asset,            // Asset associated with this entry
        uint256         amount,           // Amount of asset associated with this entry
        uint256         balance,          // Ledger account is Deposit or Loan, the new balance
        uint64          interestRateBPS,  // Interest rate in basis point if fixed
        uint256         nextPaymentDate); // Nexy payment date if associated with loan

    /**
      * @notice `Ledger` tracks balances for a given customer by asset with interest
      */
    function Ledger() public {}

    /**
      * @notice Debit a ledger account.
      * @param ledgerReason What caused this debit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this debit
      * @param asset The asset which is being debited
      * @param amount The amount to debit
      * @return final balance if applicable
      */
    function debit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal returns (uint256) {
        uint256 finalBalance;
        uint64 finalInterestRateBPS;
        uint256 finalNextPaymentDate;

        (finalBalance, finalInterestRateBPS, finalNextPaymentDate) = adjustBalance(
          customer,
          ledgerReason,
          LedgerType.Debit,
          ledgerAccount,
          asset,
          amount);

        // Debit Entry
        LedgerEntry({
            ledgerReason: ledgerReason,
            ledgerType: LedgerType.Debit,
            ledgerAccount: ledgerAccount,
            customer: customer,
            asset: asset,
            amount: amount,
            balance: finalBalance,
            interestRateBPS: finalInterestRateBPS,
            nextPaymentDate: finalNextPaymentDate
        });

        return finalBalance;
    }

    /**
      * @notice Credit a ledger account.
      * @param ledgerReason What caused this credit?
      * @param ledgerAccount Which ledger account to adjust (e.g. Deposit or Loan)
      * @param customer The customer associated with this credit
      * @param asset The asset which is being credited
      * @param amount The amount to credit
      * @return final balance if applicable
      */
    function credit(LedgerReason ledgerReason, LedgerAccount ledgerAccount, address customer, address asset, uint256 amount) internal returns (uint256) {
        uint256 finalBalance;
        uint64 finalInterestRateBPS;
        uint256 finalNextPaymentDate;

        (finalBalance, finalInterestRateBPS, finalNextPaymentDate) = adjustBalance(
          customer,
          ledgerReason,
          LedgerType.Credit,
          ledgerAccount,
          asset,
          amount);

        // Credit Entry
        LedgerEntry({
            ledgerReason: ledgerReason,
            ledgerType: LedgerType.Credit,
            ledgerAccount: ledgerAccount,
            customer: customer,
            asset: asset,
            amount: amount,
            balance: finalBalance,
            interestRateBPS: finalInterestRateBPS,
            nextPaymentDate: finalNextPaymentDate
        });

        return finalBalance;
    }

    /**
      * @notice Stub to adjust balance on a given account
      * @param customer the customer
      * @param ledgerReason which caused this adjustment
      * @param ledgerType credit or debit?
      * @param ledgerAccount which account to adjust
      * @param asset The asset to adjust
      * @param amount The amount to adjust that asset
      */
    function adjustBalance(address customer, LedgerReason ledgerReason, LedgerType ledgerType, LedgerAccount ledgerAccount, address asset, uint256 amount) internal returns (uint256, uint64, uint256) {
      revert();
    }
}
