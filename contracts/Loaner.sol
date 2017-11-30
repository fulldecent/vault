pragma solidity ^0.4.18;

import "./base/Ledger.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Loan Account
  * @author Compound
  * @notice A Savings account allows functions for customer deposits and withdrawals.
  */
contract Loaner is Owned, Ledger {

	function customerBorrow(address ) {
    	if allow(....) {
    		debit(LedgerAction.CustomerLoan, LedgerAccount.Loan, from, asset, amount);
        	credit(LedgerAction.CustomerLoan, LedgerAccount.Deposit, from, asset, amount);
    	}
    }
}