pragma solidity ^0.4.18;

import "./PigToken.sol";

/**
  * @title The Compound Token Factory Token
  * @author Compound
  * @notice The base contract for Compound test tokens
  */

contract TokenFactoryToken is PigToken {
  string public name; 
  string public symbol;
  uint public decimals;

  function TokenFactoryToken(string name_, string symbol_, uint decimals_, uint initialSupply_) public {
    name = name_;
    symbol = symbol_;
    decimals = decimals_;
    balances[msg.sender] = initialSupply_ * 10000 * (10 ** decimals);
  }
}

