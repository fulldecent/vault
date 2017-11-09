pragma solidity ^0.4.4;

contract Bank {
  struct Loan {
    uint balance;
    uint amount;
    AssetType assetType;
    address address_;
  }
  enum AssetType { ETH }
  uint savingsInterestRate;
  uint payoutsPerYear;
  Loan[] loans;
  mapping(address => mapping(uint256 => uint256)) balances;
  mapping(address => mapping(uint256 => uint256)) lastEntryTimestamps;
  event LedgerEntry(address address_, uint debit, uint credit);

  function Bank (
    uint savingsInterestRate_,
    uint payoutsPerYear_
  ) public{
    savingsInterestRate = savingsInterestRate_;
    payoutsPerYear = payoutsPerYear_;
  }

  function deposit() public payable {
    LedgerEntry(msg.sender, msg.value, 0);
    LedgerEntry(address(this), 0, msg.value);
    balances[msg.sender][uint(AssetType.ETH)] = getBalance(msg.sender, AssetType.ETH) + msg.value;
    lastEntryTimestamps[msg.sender][uint(AssetType.ETH)] = now;
  }

  function getBalance(address address_, AssetType tokenType) public view returns (uint256) {
    return balances[address_][uint(tokenType)];
  }

  function getBalanceWithInterest(address address_, uint tokenType, uint timeStamp) public returns (uint256) {
    uint principal = balances[address_][uint(tokenType)];
    uint lastEntryTimestamp = lastEntryTimestamps[msg.sender][uint(AssetType.ETH)];
    uint duration = (timeStamp - lastEntryTimestamp) / (1 years);
    uint payouts = duration * payoutsPerYear;
    uint amortization = principal;

    for(uint _i = 0; _i < payouts; _i++){
      amortization = amortization + ((amortization * savingsInterestRate) / 100 / payoutsPerYear);
    }

    return amortization;
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

<<<<<<< HEAD
  function() public payable { }
=======
  function() payable { }
>>>>>>> Add basic `newLoan` function
}
