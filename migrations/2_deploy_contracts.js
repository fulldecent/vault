var Bank = artifacts.require("./Bank.sol");
var EtherToken = artifacts.require("./tokens/EtherToken.sol");
var WalletFactory = artifacts.require("./WalletFactory.sol");

module.exports = async function(deployer) {
  await deployer.deploy(Bank);
  await deployer.deploy(EtherToken);

  await deployer.deploy(WalletFactory, Bank.address, EtherToken.address);
};
