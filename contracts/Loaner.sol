pragma solidity ^0.4.18;

import "./base/Token.sol";
import "./base/Owned.sol";

/**
  * @title The Compound Loaner
  * @author Compound
  * @notice The Compound Loaner grants users the right to take out loans
  * 		against collateral of assets.
  */
contract Loaner is Owned {
	struct Loan {
        uint balance;
        uint amount;
        address asset;
        address acct;
    }

    // TODO: Store as map and list?
    // TODO: Functions to retreive loans
    Loan[] loans;

    function newLoan(address asset, uint amountRequested) public returns (uint256) {
		// Compound currently only allows loans in ETH
		// TODO: Check asset type is supported for loans
		// TODO: Check sufficient asset value

	    Loan memory loan = Loan({
	    	asset: asset,
	    	acct: msg.sender,
	    	amount: amountRequested,
	    	balance: amountRequested
	    });

		loans.push(loan);

		uint256 amountLoaned = amountRequested;

		// TODO: If not revert
		if (!Token(asset).transfer(msg.sender, amountLoaned)) {
			revert();
		}

		return amountLoaned;
	}

	/**
      * @notice Do not pay directly into Loaner.
      */
    function() payable public {
    	revert();
    }
}