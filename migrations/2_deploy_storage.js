var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var LoanerStorage = artifacts.require("LoanerStorage.sol");
var Oracle = artifacts.require("Oracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(InterestRateStorage).then(() => {
    return deployer.deploy(LedgerStorage).then(() => {
      return deployer.deploy(LoanerStorage).then(() => {
        return deployer.deploy(Oracle).then(() => {
          return deployer.deploy(TokenStore).then(() => {
            return true;
          });
        });
      });
    });
  });
};
