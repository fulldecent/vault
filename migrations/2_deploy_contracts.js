var Vault = artifacts.require("Vault.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var PigToken = artifacts.require("PigToken.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = function(deployer, network) {
  return deployer.deploy(Vault, MINIMUM_COLLATERAL_RATIO).then(function() {
    return deployer.deploy(EtherToken).then(function() {
      return deployer.deploy(WalletFactory, Vault.address, EtherToken.address).then(function() {
      	if (network == "development" || network == "mission") {
      		return deployer.deploy(PigToken);
      	} else {
      		return true;
      	}
      });
    });
  });
};
