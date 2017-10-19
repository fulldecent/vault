pragma solidity ^0.4.4;

contract ETHSavingsAccount {
  event LedgerEntry(address address_, uint debit, uint credit);

  function deposit() payable {
    LedgerEntry(msg.sender, msg.value, 0);
    LedgerEntry(address(this), 0, msg.value);
  }
}
