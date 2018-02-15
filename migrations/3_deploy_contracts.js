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
  // First, deploy MoneyMarket, EtherToken and InterstModel
  await deployer.deploy(MoneyMarket);
  await deployer.deploy(EtherToken);
  await deployer.deploy(InterestModel);

  // Grab those now-deployed addresses
  const moneyMarket = await MoneyMarket.deployed();
  const etherToken = await EtherToken.deployed();
  const interestModel = await InterestModel.deployed();

  // Next, grab the storage contracts which were deployed in a previous migration
  const balanceSheet = await BalanceSheet.deployed();
  const borrowStorage = await BorrowStorage.deployed();
  const interestRateStorage = await InterestRateStorage.deployed();
  const ledgerStorage = await LedgerStorage.deployed();
  const priceOracle = await PriceOracle.deployed();
  const tokenStore = await TokenStore.deployed();

  // Deploy the WalletFactory, which needed the MoneyMarket and EtherToken address
  const walletFactory = await deployer.deploy(WalletFactory, moneyMarket.address, etherToken.address);

  // If we're on a test-net, let's deploy all of our faucet tokens
  if (network == "development" || network == "mission" || network == "rinkeby") {
    await deployer.deploy(FaucetTokenBAT);
    await deployer.deploy(FaucetTokenDRGN);
    await deployer.deploy(FaucetTokenOMG);
    await deployer.deploy(FaucetTokenZRX);
    await deployer.deploy(TokenFactory);
  }

  // Finally, we need to set-up our allowences and storage
  // Note: if this is after the initial deploy, we should use `allow.js` for
  //       allowences instead of setting them here.
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
