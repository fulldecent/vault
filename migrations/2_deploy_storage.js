const BalanceSheet = artifacts.require("BalanceSheet.sol");
const BorrowStorage = artifacts.require("BorrowStorage.sol");
const InterestRateStorage = artifacts.require("InterestRateStorage.sol");
const LedgerStorage = artifacts.require("LedgerStorage.sol");
const PriceOracle = artifacts.require("PriceOracle.sol");
const TokenStore = artifacts.require("TokenStore.sol");

async function deployAll(deployer, network) {
  // Here, we deploy all of our storage contracts

  // The hope is that these never need to be upgraded.
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
