const MoneyMarket = artifacts.require("./MoneyMarket.sol");

const BalanceSheet = artifacts.require("./storage/BalanceSheet.sol");
const BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const PriceOracle = artifacts.require("./storage/PriceOracle.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
  const moneyMarket = await MoneyMarket.deployed();

  console.log("Allowing to " + moneyMarket.address);

  const balanceSheet = await BalanceSheet.deployed()
  const borrowStorage = await BorrowStorage.deployed()
  const interestRateStorage = await InterestRateStorage.deployed()
  const ledgerStorage = await LedgerStorage.deployed()
  const priceOracle = await PriceOracle.deployed()
  const tokenStore = await TokenStore.deployed()

  await Promise.all([
    balanceSheet.allow(moneyMarket.address),
    borrowStorage.allow(moneyMarket.address),
    interestRateStorage.allow(moneyMarket.address),
    ledgerStorage.allow(moneyMarket.address),
    priceOracle.allow(moneyMarket.address),
    tokenStore.allow(moneyMarket.address)
  ]);

  console.log("All has been allowed to " + moneyMarket.address);

  callback();
};