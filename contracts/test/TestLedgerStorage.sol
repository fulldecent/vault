pragma solidity ^0.4.18;

/**
  * @title Test Contract for Ledger Storage
  * @author Compound
  */
contract TestLedgerStorage {
	mapping(uint8 => mapping(address => uint256)) balanceSheet;

	function setBalanceSheetBalance(address asset, uint8 ledgerAccount, uint amount) public returns (uint256) {
        return balanceSheet[ledgerAccount][asset] = amount;
    }

	function getBalanceSheetBalance(address asset, uint8 ledgerAccount) public view returns (uint256) {
        return balanceSheet[ledgerAccount][asset];
    }

    function getBalanceBlockNumber(address customer, uint8 ledgerAccount, address asset) public view returns (uint256) {
        return block.number;
    }
}