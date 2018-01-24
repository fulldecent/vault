var MoneyMarket = artifacts.require("MoneyMarket.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var PigToken = artifacts.require("PigToken.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");
var TokenFactory = artifacts.require("TokenFactory.sol");
var SupplyInterestRateStorage = artifacts.require("SupplyInterestRateStorage.sol");
var BorrowInterestRateStorage = artifacts.require("BorrowInterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = function(deployer, network) {
  return deployer.deploy(MoneyMarket).then(() => {
    return deployer.deploy(EtherToken).then(() => {
      return EtherToken.deployed().then(etherToken => {
        return SupplyInterestRateStorage.deployed().then(supplyInterestRateStorage => {
          return BorrowInterestRateStorage.deployed().then(borrowInterestRateStorage => {
            return LedgerStorage.deployed().then(ledgerStorage => {
              return BorrowStorage.deployed().then(borrowStorage => {
                return PriceOracle.deployed().then(priceOracle => {
                  return TokenStore.deployed().then(tokenStore => {
                    return MoneyMarket.deployed().then(moneyMarket => {
                      return deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address).then(() => {
                        const contracts = [];

                        if (network == "development" || network == "mission" || network == "rinkeby") {
                          contracts.push(PigToken);
                          contracts.push(TokenFactory);
                        }

                        return deployer.deploy(contracts).then(() => {
                          return Promise.all([
                            borrowStorage.setMinimumCollateralRatio(MINIMUM_COLLATERAL_RATIO),
                            supplyInterestRateStorage.allow(moneyMarket.address),
                            borrowInterestRateStorage.allow(moneyMarket.address),
                            ledgerStorage.allow(moneyMarket.address),
                            borrowStorage.allow(moneyMarket.address),
                            priceOracle.allow(moneyMarket.address),
                            tokenStore.allow(moneyMarket.address),
                            moneyMarket.setSupplyInterestRateStorage(supplyInterestRateStorage.address),
                            moneyMarket.setBorrowInterestRateStorage(borrowInterestRateStorage.address),
                            moneyMarket.setLedgerStorage(ledgerStorage.address),
                            moneyMarket.setBorrowStorage(borrowStorage.address),
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
          });
        });
      });
    });
  });
};
