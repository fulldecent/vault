var EtherToken = artifacts.require("EtherToken.sol");
var MoneyMarket = artifacts.require("MoneyMarket.sol");
var InterestModel = artifacts.require("InterestModel.sol");
var TokenFactory = artifacts.require("TokenFactory.sol");
var WalletFactory = artifacts.require("WalletFactory.sol");

var FaucetTokenBAT = artifacts.require("FaucetTokenBAT.sol");
var FaucetTokenDRGN = artifacts.require("FaucetTokenDRGN.sol");
var FaucetTokenOMG = artifacts.require("FaucetTokenOMG.sol");
var FaucetTokenZRX = artifacts.require("FaucetTokenZRX.sol");

var BalanceSheet = artifacts.require("BalanceSheet.sol");
var BorrowStorage = artifacts.require("BorrowStorage.sol");
var InterestRateStorage = artifacts.require("InterestRateStorage.sol");
var LedgerStorage = artifacts.require("LedgerStorage.sol");
var PriceOracle = artifacts.require("PriceOracle.sol");
var TokenStore = artifacts.require("TokenStore.sol");

const MINIMUM_COLLATERAL_RATIO = 2;

async function deployAll(deployer, network) {
  await deployer.deploy(MoneyMarket);
  await deployer.deploy(EtherToken);
  await deployer.deploy(InterestModel);

  const moneyMarket = await MoneyMarket.deployed();
  const etherToken = await EtherToken.deployed();
  const interestModel = await InterestModel.deployed();

  const balanceSheet = await BalanceSheet.deployed();
  const borrowStorage = await BorrowStorage.deployed();
  const interestRateStorage = await InterestRateStorage.deployed();
  const ledgerStorage = await LedgerStorage.deployed();
  const priceOracle = await PriceOracle.deployed();
  const tokenStore = await TokenStore.deployed();

  const walletFactory = await deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address);

  const contracts = [];

  if (network == "development" || network == "mission" || network == "rinkeby") {
    contracts.push(FaucetTokenBAT);
    contracts.push(FaucetTokenDRGN);
    contracts.push(FaucetTokenOMG);
    contracts.push(FaucetTokenZRX);
    contracts.push(TokenFactory);
  }

  await deployer.deploy(contracts);

  await Promise.all([
    borrowStorage.setMinimumCollateralRatio(MINIMUM_COLLATERAL_RATIO),

    moneyMarket.setInterestModel(interestModel.address),

    balanceSheet.allow(moneyMarket.address),
    borrowStorage.allow(moneyMarket.address),
    interestRateStorage.allow(moneyMarket.address),
    ledgerStorage.allow(moneyMarket.address),
    priceOracle.allow(moneyMarket.address),
    tokenStore.allow(moneyMarket.address),

    moneyMarket.setBalanceSheet(balanceSheet.address),
    moneyMarket.setBorrowStorage(borrowStorage.address),
    moneyMarket.setInterestRateStorage(interestRateStorage.address),
    moneyMarket.setLedgerStorage(ledgerStorage.address),
    moneyMarket.setPriceOracle(priceOracle.address),
    moneyMarket.setTokenStore(tokenStore.address)
  ]);

  console.log("Deployed all contracts and storage v3.");
}

module.exports = function(deployer, network) {
  deployer.then(async () => await deployAll(deployer, network));
};
