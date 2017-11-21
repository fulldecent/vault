var Vault = artifacts.require("./Vault.sol");
var EtherToken = artifacts.require("./tokens/EtherToken.sol");
var WalletFactory = artifacts.require("./WalletFactory.sol");

module.exports = async function(deployer) {
  await deployer.deploy(Vault, 2);
  await deployer.deploy(EtherToken);

  await deployer.deploy(WalletFactory, Vault.address, EtherToken.address);
};
