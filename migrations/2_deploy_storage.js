var BalanceSheet = artifacts.require("BalanceSheet.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

async function deployAll(deployer, network) {
  const balanceSheet = await deployer.deploy(BalanceSheet);
  const borrowStorage = await deployer.deploy(BorrowStorage);
  const interestRateStorage = await deployer.deploy(InterestRateStorage);
  const ledgerStorage = await deployer.deploy(LedgerStorage);
  const priceOracle = await deployer.deploy(PriceOracle);
  const tokenStore = await deployer.deploy(TokenStore);

  console.log("Deployed all contracts and storage v2.");
}

module.exports = function(deployer, network) {
  deployer.then(async () => await deployAll(deployer, network));
};
