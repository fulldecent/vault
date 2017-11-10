pragma solidity ^0.4.4;

contract Bank is Oracle, Ledger {
  struct Loan {
    uint balance;
    uint amount;
    AssetType assetType;
    address address_;
  }

  Loan[] loans;

  function Bank (
    uint64 savingsInterestRate_,
    uint64 payoutsPerYear_
  ) public {
    Ledger ledger = new Ledger(savingsInterestRate_, payoutsPerYear_);
  }

  function newLoan(uint amountRequested, AssetType assetType) returns (uint amountLoaned){
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

  /**
    * @notice `getValueEquivalent` returns the value of the account based on
      Oracle prices of assets. Note: this includes the Eth value itself.
    * @param acct The account to view value balance
    * @return value The value of the acct in Eth equivalancy
    */
  function getValueEquivalent(address acct) public view returns (uint256) {
    address[] assets = getSupportAssets(); // from Oracle
    uint256 balance = getBalanceWithInterest(acct); // From Ledger

    for uint i = 0; i < assets.length; i++ {
      // TODO: Interest on tokens
      address asset = assets[i];
      balance += getAssetValue(asset);
    }
  }

  function() payable { }
}
