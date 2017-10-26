pragma solidity ^0.4.4;

contract ETHSavingsAccount {
  enum Tokens { ETH }
  uint interestRate;
  uint payoutsPerPeriod;
  mapping(address => mapping(uint256 => uint256)) balances;
  mapping(address => mapping(uint256 => uint256)) lastEntryTimestamps;
  event LedgerEntry(address address_, uint debit, uint credit);

  function ETHSavingsAccount (uint interestRate_, uint payoutsPerPeriod_) public{
    interestRate = interestRate_;
    payoutsPerPeriod = payoutsPerPeriod_;
  }

  function deposit() public payable {
    LedgerEntry(msg.sender, msg.value, 0);
    LedgerEntry(address(this), 0, msg.value);
    balances[msg.sender][uint(Tokens.ETH)] = balances[msg.sender][uint(Tokens.ETH)] + msg.value;
    lastEntryTimestamps[msg.sender][uint(Tokens.ETH)] = now;
  }

  function getBalance(address address_, int tokenType) public view returns (uint256) {
    return balances[address_][uint(tokenType)];
  }

  function getBalanceWithInterest(address address_, uint tokenType, uint timeStamp) public returns (uint256) {
    uint principal = balances[address_][uint(tokenType)];
    uint lastEntryTimestamp = lastEntryTimestamps[msg.sender][uint(Tokens.ETH)];
    uint duration = (timeStamp - lastEntryTimestamp) / (1 years);
    uint payouts = duration * payoutsPerPeriod;
    uint amortization = principal;

    for(uint _i = 0; _i < payouts; _i++){
      amortization = amortization + ((amortization * interestRate) / 100 / payoutsPerPeriod);
    }

    return amortization;
  }
}
