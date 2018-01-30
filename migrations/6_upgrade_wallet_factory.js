var WalletFactory = artifacts.require("WalletFactory.sol");

var MoneyMarket = artifacts.require("MoneyMarket.sol");
var EtherToken = artifacts.require("EtherToken.sol");

module.exports = function(deployer, network) {
  return MoneyMarket.deployed().then(moneyMarket => {
    return EtherToken.deployed().then(etherToken => {
      return deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address).then(() => {
        console.log("Deployed upgraded WalletFactory.");

        return true;
      });
    });
  });
};