const MoneyMarket = artifacts.require("./MoneyMarket.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const WalletFactory = artifacts.require("./WalletFactory.sol");

const TokenFactory = artifacts.require("./TokenFactory.sol");
const FaucetTokenBAT = artifacts.require("FaucetTokenBAT.sol");
const FaucetTokenDRGN = artifacts.require("FaucetTokenDRGN.sol");
const FaucetTokenOMG = artifacts.require("FaucetTokenOMG.sol");
const FaucetTokenZRX = artifacts.require("FaucetTokenZRX.sol");

const BalanceSheet = artifacts.require("./storage/BalanceSheet.sol");
const BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const PriceOracle = artifacts.require("./storage/PriceOracle.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
  const balanceSheet = await BalanceSheet.deployed()
  const borrowStorage = await BorrowStorage.deployed()
  const etherToken = await EtherToken.deployed();
  const interestModel = await InterestModel.deployed();
  const interestRateStorage = await InterestRateStorage.deployed();
  const ledgerStorage = await LedgerStorage.deployed();
  const moneyMarket = await MoneyMarket.deployed();
  const priceOracle = await PriceOracle.deployed();
  const tokenStore = await TokenStore.deployed();
  const walletFactory = await WalletFactory.deployed();

  const tokens = {
    [etherToken.address]: "eth"
  };

  var tokenFactoryAddress;

  try {
    const faucetTokenBAT = await FaucetTokenBAT.deployed();
    tokens[faucetTokenBAT.address] = "bat";

    const faucetTokenDRGN = await FaucetTokenDRGN.deployed();
    tokens[faucetTokenDRGN.address] = "drgn";

    const faucetTokenOMG = await FaucetTokenOMG.deployed();
    tokens[faucetTokenOMG.address] = "omg";

    const faucetTokenZRX = await FaucetTokenZRX.deployed();
    tokens[faucetTokenZRX.address] = "zrx";
  } catch (e) {
    console.log("Faucet tokens not deployed");
  }

  try {
    tokenFactoryAddress = (await TokenFactory.deployed()).address;
  } catch (e) {
    console.log("TokenFactory not deployed");
  }

  process.stderr.write(JSON.stringify(
    {
      "balance_sheet": balanceSheet.address,
      "borrow_storage": borrowStorage.address,
      "ether_token": etherToken.address,
      "interest_model": interestModel.address,
      "interest_rate_storage": interestRateStorage.address,
      "ledger_storage": ledgerStorage.address,
      "money_market": moneyMarket.address,
      "price_oracle": priceOracle.address,
      "token_factory": tokenFactoryAddress,
      "token_store": tokenStore.address,
      "tokens": tokens,
      "wallet_factory": walletFactory.address,
    }
  ));

  callback();
}
