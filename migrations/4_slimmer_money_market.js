var MoneyMarket = artifacts.require("MoneyMarket.sol");

var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");
var InterestModel = artifacts.require("InterestModel.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(MoneyMarket).then(() => {
    return InterestRateStorage.deployed().then(interestRateStorage => {
      return LedgerStorage.deployed().then(ledgerStorage => {
        return BorrowStorage.deployed().then(loanerStorage => {
          return PriceOracle.deployed().then(priceOracle => {
            return TokenStore.deployed().then(tokenStore => {
              return MoneyMarket.deployed(moneyMarket => {
                return Promise.all([
                  moneyMarket.setInterestRateStorage(interestRateStorage.address),
                  moneyMarket.setLedgerStorage(ledgerStorage.address),
                  moneyMarket.setBorrowStorage(loanerStorage.address),
                  moneyMarket.setPriceOracle(priceOracle.address),
                  moneyMarket.setTokenStore(tokenStore.address),
                ]);
              });
            });
          });
        });
      });
    });
  });
};