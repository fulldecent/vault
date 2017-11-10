pragma solidity ^0.4.4;

contract Loaner {
	enum AssetType { ETH }

	struct Loan {
        uint balance;
        uint amount;
        AssetType assetType;
        address address_;
    }

    Loan[] loans;

    function newLoan(uint amountRequested, AssetType assetType) public returns (uint amountLoaned){
		// Compound currently only allows loans in ETH
		assert(assetType == AssetType.ETH);

	    Loan memory loan = Loan({
	    	assetType: assetType,
	    	amount: amountRequested,
	    	balance: amountRequested,
	    	address_: msg.sender
	    });

		loans.push(loan);
		amountLoaned = amountRequested;
		msg.sender.transfer(amountLoaned);
	}
}