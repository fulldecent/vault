var Vault = artifacts.require("Vault.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = function(deployer, network) {
  return deployer.deploy(Vault, MINIMUM_COLLATERAL_RATIO).then(() => {
    return LedgerStorage.deployed().then(ledgerStorage => {
      return Vault.deployed(vault => {
        return Promise.all([
          vault.setLedgerStorage(ledgerStorage.address),
          ledgerStorage.allow(vault.address)
        ]);
      });
    });
  });
};
