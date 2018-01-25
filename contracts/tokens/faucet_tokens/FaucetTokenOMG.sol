pragma solidity ^0.4.18;

import "../FaucetToken.sol";

/**
  * @title The Compound OMG Faucet Test Token
  * @author Compound
  * @notice A simple token for test that follows faucet rules.
  */
contract FacuetTokenOMG is FaucetToken {
    string constant public name = "OMG Facuet Token";
    string constant public symbol = "OMG";
    uint8 constant public decimals = 18;
}
