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
                  return moneyMarket.setBorrowInterestRateStorage(borrowInterestRateStorage.address).then(() => {
                    return moneyMarket.setSupplyInterestRateStorage(supplyInterestRateStorage.address).then(() => {
                      return moneyMarket.setLedgerStorage(ledgerStorage.address).then(() => {
                        return moneyMarket.setBorrowStorage(loanerStorage.address).then(() => {
                          return moneyMarket.setPriceOracle(priceOracle.address).then(() => {
                            return moneyMarket.setTokenStore(tokenStore.address).then(() => {
                              console.log("Deployed all contracts and storage.");

                              return true;
                            });
                          });
                        });
                      });
                    });
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