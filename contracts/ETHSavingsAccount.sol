pragma solidity ^0.4.4;

contract ETHSavingsAccount {
  enum Tokens { ETH }
  mapping(address => mapping(uint256 => uint256)) balances;
  event LedgerEntry(address address_, uint debit, uint credit);

  function deposit() public payable {
    LedgerEntry(msg.sender, msg.value, 0);
    LedgerEntry(address(this), 0, msg.value);
    balances[msg.sender][uint(Tokens.ETH)] = balances[msg.sender][uint(Tokens.ETH)] + msg.value;
  }

  function getBalance(address address_, int tokenType) public view returns (uint256) {
    return balances[address_][uint(tokenType)];
  }
}
