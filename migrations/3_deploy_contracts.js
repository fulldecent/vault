var Vault = artifacts.require("Vault.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var PigToken = artifacts.require("PigToken.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");
var TokenFactory = artifacts.require("TokenFactory.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = function(deployer, network) {
  return deployer.deploy([
    [Vault, MINIMUM_COLLATERAL_RATIO],
    [EtherToken],
    [WalletFactory]
  ]).then(() => {
    LedgerStorage.deployed().then(ledgerStorage => {
      Vault.deployed(vault => {
        console.log("vault");
        console.log(vault);

        console.log("ledgerStorage");
        console.log(ledgerStorage);

        const contracts = [];

        if (network == "development" || network == "mission" || network == "rinkeby") {
          contracts.push(PigToken);
          contracts.push(TokenFactory);
        }

        return deployer.deploy(contracts).then(() => {
          return Promise.all([
            vault.setLedgerStorage(ledgerStorage.address),
            ledgerStorage.allow(vault.address)
          ]);
        });
      });
    });
  });
};
