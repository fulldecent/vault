var MoneyMarket = artifacts.require("MoneyMarket.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");

var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var InterestModel = artifacts.require("InterestModel.sol");

module.exports = function(deployer, network) {
  return deployer.deploy(MoneyMarket).then(() => {
    return deployer.deploy(InterestRateStorage).then(() => {
      return deployer.deploy(InterestModel).then(() => {
        return InterestRateStorage.deployed().then(interestRateStorage => {
          return InterestModel.deployed().then(interestModel => {
            return LedgerStorage.deployed().then(ledgerStorage => {
              return BorrowStorage.deployed().then(loanerStorage => {
                return PriceOracle.deployed().then(priceOracle => {
                  return TokenStore.deployed().then(tokenStore => {
                    return MoneyMarket.deployed().then(moneyMarket => {
                      return EtherToken.deployed().then(etherToken => {
                        return deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address).then(() => {
                          return interestRateStorage.allow(moneyMarket.address).then(() => {
                            return moneyMarket.setInterestRateStorage(interestRateStorage.address).then(() => {
                              return moneyMarket.setInterestModel(interestModel.address).then(() => {
                                return moneyMarket.setLedgerStorage(ledgerStorage.address).then(() => {
                                  return moneyMarket.setBorrowStorage(loanerStorage.address).then(() => {
                                    return moneyMarket.setPriceOracle(priceOracle.address).then(() => {
                                      return moneyMarket.setTokenStore(tokenStore.address).then(() => {
                                        console.log("Deployed all contracts and storage v8.");

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
          });
        });
      });
    });
  });
};