var SavingsInterestRateStorage = artifacts.require("SavingsInterestRateStorage.sol");
var BorrowInterestRateStorage = artifacts.require("BorrowInterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var LoanerStorage = artifacts.require("LoanerStorage.sol");
var Oracle = artifacts.require("Oracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

const BLOCK_UNIT_SCALE = 1000;

module.exports = function(deployer, network) {
  return deployer.deploy(SavingsInterestRateStorage, BLOCK_UNIT_SCALE).then(() => {
    return deployer.deploy(BorrowInterestRateStorage, BLOCK_UNIT_SCALE).then(() => {
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
  });
};
