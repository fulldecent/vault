var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var LoanerStorage = artifacts.require("LoanerStorage.sol");
var Oracle = artifacts.require("Oracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

module.exports = function(deployer, network) {
  return deployer.deploy([
    InterestRateStorage,
    LedgerStorage,
    LoanerStorage,
    Oracle,
    TokenStore
  ]);
};
