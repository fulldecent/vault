var Vault = artifacts.require("Vault.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var LoanerStorage = artifacts.require("LoanerStorage.sol");
var Oracle = artifacts.require("Oracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(Vault).then(() => {
    return InterestRateStorage.deployed().then(interestRateStorage => {
      return LedgerStorage.deployed().then(ledgerStorage => {
        return LoanerStorage.deployed().then(loanerStorage => {
          return Oracle.deployed().then(oracle => {
            return TokenStore.deployed().then(tokenStore => {
              return Vault.deployed(vault => {
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