var Vault = artifacts.require("Vault.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var LoanerStorage = artifacts.require("LoanerStorage.sol");
var Oracle = artifacts.require("Oracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(Vault).then(() => {
    InterestRateStorage.deployed().then(interestRateStorage => {
      LedgerStorage.deployed().then(ledgerStorage => {
        LoanerStorage.deployed().then(loanerStorage => {
          Oracle.deployed().then(oracle => {
            TokenStore.deployed().then(tokenStore => {
              Vault.deployed(vault => {
                return Promise.all([
                  vault.setInterestRateStorage(interestRateStorage.address),
                  vault.setLedgerStorage(ledgerStorage.address),
                  vault.setLoanerStorage(loanerStorage.address),
                  vault.setOracle(oracle.address),
                  vault.setTokenStore(tokenStore.address),
                ]);
              });
            });
          });
        });
      });
    });
  });
};