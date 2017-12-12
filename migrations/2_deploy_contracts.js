var Vault = artifacts.require("Vault.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var PigToken = artifacts.require("PigToken.sol");
var TokenFactory = artifacts.require("./TokenFactory.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = async function(deployer, network) {
  await deployer.deploy(TokenFactory);
  await deployer.deploy(Vault, MINIMUM_COLLATERAL_RATIO);
  await deployer.deploy(EtherToken);
  await deployer.deploy(WalletFactory, Vault.address, EtherToken.address);

  if (network == "development" || network == "mission") {
    await deployer.deploy(PigToken);
  };
};
