var Vault = artifacts.require("Vault.sol");
var EtherToken = artifacts.require("EtherToken.sol");
var PigToken = artifacts.require("PigToken.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");
var TokenFactory = artifacts.require("TokenFactory.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var LoanerStorage = artifacts.require("LoanerStorage.sol");
var Oracle = artifacts.require("Oracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

module.exports = function(deployer, network) {
  return deployer.deploy([
    Vault,
    EtherToken,
    WalletFactory
  ]).then(() => {
    return InterestRateStorage.deployed().then(interestRateStorage => {
      return LedgerStorage.deployed().then(ledgerStorage => {
        return LoanerStorage.deployed().then(loanerStorage => {
          return Oracle.deployed().then(oracle => {
            return TokenStore.deployed().then(tokenStore => {
              return Vault.deployed(vault => {
                const contracts = [];

                if (network == "development" || network == "mission" || network == "rinkeby") {
                  contracts.push(PigToken);
                  contracts.push(TokenFactory);
                }

                return deployer.deploy(contracts).then(() => {
                  return Promise.all([
                    loanerStorage.setMinimumCollateralRatio(MINIMUM_COLLATERAL_RATIO),
                    interestRateStorage.allow(vault.address),
                    ledgerStorage.allow(vault.address),
                    loanerStorage.allow(vault.address),
                    oracle.allow(vault.address),
                    tokenStore.allow(vault.address),
                    vault.setInterestRateStorage(interestRateStorage.address),
                    vault.setLedgerStorage(ledgerStorage.address),
                    vault.setLoanerStorage(loanerStorage.address),
                    vault.setOracle(oracle.address),
                    vault.setTokenStore(tokenStore.address),
                  ]);
                });
              });
            });
          });
        });
      });
    });
  });
};
