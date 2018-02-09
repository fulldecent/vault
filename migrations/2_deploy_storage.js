var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(InterestRateStorage).then(() => {
    return deployer.deploy(LedgerStorage).then(() => {
      return deployer.deploy(BorrowStorage).then(() => {
        return deployer.deploy(PriceOracle).then(() => {
          return deployer.deploy(TokenStore).then(() => {
            return true;
          });
        });
      });
    });
  });
};
