pragma solidity ^0.4.18;

import "../FaucetToken.sol";

/**
  * @title The Compound BAT Faucet Test Token
  * @author Compound
  * @notice A simple token for test that follows faucet rules.
  */
contract FaucetTokenBAT is FaucetToken {
    string constant public name = "BAT Faucet Token";
    string constant public symbol = "BAT";
    uint8 constant public decimals = 10;
}
