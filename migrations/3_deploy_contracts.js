var MoneyMarket = artifacts.require("MoneyMarket.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var FaucetTokenBAT = artifacts.require("FaucetTokenBAT.sol");
var FaucetTokenDRGN = artifacts.require("FaucetTokenDRGN.sol");
var FaucetTokenOMG = artifacts.require("FaucetTokenOMG.sol");
var FaucetTokenZRX = artifacts.require("FaucetTokenZRX.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");
var TokenFactory = artifacts.require("TokenFactory.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var InterestModel = artifacts.require("InterestModel.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = function(deployer, network) {
  return deployer.deploy(MoneyMarket).then(() => {
    return deployer.deploy(EtherToken).then(() => {
      return deployer.deploy(InterestModel).then(() => {
        return EtherToken.deployed().then(etherToken => {
          return InterestModel.deployed().then(interestModel => {
            return InterestRateStorage.deployed().then(interestRateStorage => {
              return LedgerStorage.deployed().then(ledgerStorage => {
                return BorrowStorage.deployed().then(borrowStorage => {
                  return PriceOracle.deployed().then(priceOracle => {
                    return TokenStore.deployed().then(tokenStore => {
                      return MoneyMarket.deployed().then(moneyMarket => {
                        return deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address).then(() => {
                          const contracts = [];

                          if (network == "development" || network == "mission" || network == "rinkeby") {
                            contracts.push(FaucetTokenBAT);
                            contracts.push(FaucetTokenDRGN);
                            contracts.push(FaucetTokenOMG);
                            contracts.push(FaucetTokenZRX);
                            contracts.push(TokenFactory);
                          }

                          return deployer.deploy(contracts).then(() => {
                            return Promise.all([
                              borrowStorage.setMinimumCollateralRatio(MINIMUM_COLLATERAL_RATIO),
                              interestRateStorage.allow(moneyMarket.address),
                              ledgerStorage.allow(moneyMarket.address),
                              borrowStorage.allow(moneyMarket.address),
                              priceOracle.allow(moneyMarket.address),
                              tokenStore.allow(moneyMarket.address),
                              moneyMarket.setInterestRateStorage(interestRateStorage.address),
                              moneyMarket.setLedgerStorage(ledgerStorage.address),
                              moneyMarket.setBorrowStorage(borrowStorage.address),
                              moneyMarket.setPriceOracle(priceOracle.address),
                              moneyMarket.setTokenStore(tokenStore.address),
                              moneyMarket.setInterestModel(interestModel.address),
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
  });
};
