pragma solidity ^0.4.18;

/**
  * @title The Compound Balance Sheet
  * @author Compound
  * @notice The balance sheet keeps track of balances based on credits and debits
  *         to given customer deposit and loan accounts.
  */
contract BalanceSheet {
    enum LedgerReason { CustomerDeposit, CustomerWithdrawal, Interest }
    enum LedgerType { Debit, Credit }
    enum LedgerAccount { Cash, Loan, Deposit, InterestExpense, InterestIncome }

    struct BalanceCheckpoint {
        uint256 balance;
        uint256 timestamp;
        uint64  interestRateBPS;
        uint256 nextPaymentDate;
    }

    // A map of customer -> LedgerAccount{Deposit, Loan} -> asset -> balance
    mapping(address => mapping(uint8 => mapping(address => BalanceCheckpoint))) balanceCheckpoints;

    function creditBalance(
      address customer,
      LedgerReason ledgerReason,
      LedgerType ledgerType,
      LedgerAccount ledgerAccount,
      address asset,
      uint256 amount
    ) internal returns (uint256) {
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];
        checkpoint.balance += amount;
        return checkpoint.balance;
    }

    function debitBalance(
      address customer,
      LedgerReason ledgerReason,
      LedgerType ledgerType,
      LedgerAccount ledgerAccount,
      address asset,
      uint256 amount
    ) internal returns (uint256) {
        BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];
        checkpoint.balance -= amount;
        return checkpoint.balance;
    }

    function saveCheckpoint(
      address customer,
      LedgerReason ledgerReason,
      LedgerAccount ledgerAccount,
      address asset
    ) {
      BalanceCheckpoint storage checkpoint = balanceCheckpoints[customer][uint8(ledgerAccount)][asset];
      require(ledgerReason == LedgerReason.Interest ||
              checkpoint.timestamp == now);
      checkpoint.timestamp = now;
    }
}
