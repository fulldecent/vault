var MoneyMarket = artifacts.require("MoneyMarket.sol");

var BorrowInterestRateStorage = artifacts.require("BorrowInterestRateStorage.sol");
var SupplyInterestRateStorage = artifacts.require("SupplyInterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(MoneyMarket).then(() => {
    return BorrowInterestRateStorage.deployed().then(borrowInterestRateStorage => {
      return SupplyInterestRateStorage.deployed().then(supplyInterestRateStorage => {
        return LedgerStorage.deployed().then(ledgerStorage => {
          return BorrowStorage.deployed().then(loanerStorage => {
            return PriceOracle.deployed().then(priceOracle => {
              return TokenStore.deployed().then(tokenStore => {
                return MoneyMarket.deployed().then(moneyMarket => {
                  return Promise.all([
                    moneyMarket.setBorrowInterestRateStorage(borrowInterestRateStorage.address),
                    moneyMarket.setSupplyInterestRateStorage(supplyInterestRateStorage.address),
                    moneyMarket.setLedgerStorage(ledgerStorage.address),
                    moneyMarket.setBorrowStorage(loanerStorage.address),
                    moneyMarket.setPriceOracle(priceOracle.address),
                    moneyMarket.setTokenStore(tokenStore.address),
                  ]).then(() => {
                    console.log("Deployed all contracts and storage.");
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};