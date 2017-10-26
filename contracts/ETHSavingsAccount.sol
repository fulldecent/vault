pragma solidity ^0.4.4;

contract ETHSavingsAccount {
  enum Tokens { ETH }
  uint interestRate;
  uint payoutsPerPeriod;
  mapping(address => mapping(uint256 => uint256)) balances;
  event LedgerEntry(address address_, uint debit, uint credit);

  function ETHSavingsAccount (uint interestRate_, uint payoutsPerPeriod_) public{
    interestRate = interestRate_;
    payoutsPerPeriod = payoutsPerPeriod_;
  }

  function deposit() public payable {
    LedgerEntry(msg.sender, msg.value, 0);
    LedgerEntry(address(this), 0, msg.value);
    balances[msg.sender][uint(Tokens.ETH)] = balances[msg.sender][uint(Tokens.ETH)] + msg.value;
  }

  function getBalance(address address_, int tokenType) public view returns (uint256) {
    return balances[address_][uint(tokenType)];
  }

  function getBalanceWithInterest(address address_, uint tokenType, uint time) public view returns (uint256) {
    uint principal = balances[address_][uint(tokenType)];
    uint payouts = time * payoutsPerPeriod;

    uint amortization = principal;

    for(uint i = 0; i < payouts; i++){
      amortization = amortization + ((amortization * interestRate) / 100 / payoutsPerPeriod);
    }

    return amortization;
    // return principal * ((precision + uint(interestRate * (precision/100)/payoutsPerPeriod)) ** payouts) / (precision ** payouts);
  }
}
