pragma solidity ^0.4.18;

import "../FaucetToken.sol";

/**
  * @title The Compound DRGN Faucet Test Token
  * @author Compound
  * @notice A simple token for test that follows faucet rules.
  */
contract FaucetTokenDRGN is FaucetToken {
    string constant public name = "DRGN Faucet Token";
    string constant public symbol = "DRGN";
    uint8 constant public decimals = 10;
}
