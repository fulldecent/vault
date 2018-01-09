pragma solidity ^0.4.18;

import "./Ledger.sol";
import "./Savings.sol";
import "./Loaner.sol";

/**
  * @title The Compound Vault Contract
  * @author Compound
  * @notice The Compound Vault Contract in the core contract governing
  *         all accounts in Compound.
  */
contract Vault is Ledger, Savings, Loaner {

    /**
      * @notice `Vault` is the core Compound Vault contract
      */
    function Vault() public {
    }

    /**
      * @notice Do not pay directly into Vault, please use `deposit`.
      */
    function() payable public {
        revert();
    }
}
