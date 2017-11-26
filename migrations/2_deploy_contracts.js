var Vault = artifacts.require("Vault.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");

module.exports = function(deployer) {
  return deployer.deploy(Vault, 2).then(function() {
    return deployer.deploy(EtherToken).then(function() {
      return deployer.deploy(WalletFactory, Vault.address, EtherToken.address);
    });
  });
};
