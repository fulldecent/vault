pragma solidity ^0.4.18;

import "../FaucetToken.sol";

/**
  * @title The Compound ZRX Faucet Test Token
  * @author Compound
  * @notice A simple token for test that follows faucet rules.
  */
contract FacuetTokenZRX is FaucetToken {
    string constant public name = "ZRX Facuet Token";
    string constant public symbol = "ZRX";
    uint8 constant public decimals = 18;
}
