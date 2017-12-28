pragma solidity ^0.4.18;

import "./tokens/TokenFactoryToken.sol";

/**
  * @title The Compound Token Factory
  * @author Compound
  * @notice The Compound Token Factory allows creation of tokens for testig purposes
  */

contract TokenFactory {
  address public lastToken;

  event NewToken(address tokenAddress, string name, string symbol, uint decimals, uint initialSupply);

  /**
    * @notice `createToken` creates a token and issues the entire initial supply to the message sender
    * @param name_ The token's name
    * @param symbol_ The token's symbol
    * @param decimals_ The token's decimals
    * @param initialSupply_ The token's initial supply
    * @return the token address
    */
  function createToken(string name_, string symbol_, uint decimals_, uint initialSupply_) public {
    lastToken = new TokenFactoryToken(name_, symbol_, decimals_, initialSupply_);

    NewToken(address(lastToken), name_, symbol_, decimals_, initialSupply_);
  }
}
