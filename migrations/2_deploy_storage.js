var SupplyInterestRateStorage = artifacts.require("SupplyInterestRateStorage.sol");
var BorrowInterestRateStorage = artifacts.require("BorrowInterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

const BLOCK_UNIT_SCALE = 1000;

module.exports = function(deployer, network) {
  return deployer.deploy(SupplyInterestRateStorage, BLOCK_UNIT_SCALE).then(() => {
    return deployer.deploy(BorrowInterestRateStorage, BLOCK_UNIT_SCALE).then(() => {
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
  });
};
