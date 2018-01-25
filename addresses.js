var MoneyMarket = artifacts.require("./MoneyMarket.sol");
var EtherToken = artifacts.require("./tokens/EtherToken.sol");
var FaucetTokenBAT = artifacts.require("FaucetTokenBAT.sol");
var FaucetTokenDRGN = artifacts.require("FaucetTokenDRGN.sol");
var FaucetTokenOMG = artifacts.require("FaucetTokenOMG.sol");
var FaucetTokenZRX = artifacts.require("FaucetTokenZRX.sol");
var WalletFactory = artifacts.require("./WalletFactory.sol");
var TokenFactory = artifacts.require("./TokenFactory.sol");

var SupplyInterestRateStorage = artifacts.require("./storage/SupplyInterestRateStorage.sol");
var BorrowInterestRateStorage = artifacts.require("./storage/BorrowInterestRateStorage.sol");
var LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
var BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
var PriceOracle = artifacts.require("./storage/PriceOracle.sol");
var TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
	const moneyMarket = await MoneyMarket.deployed();
	const etherToken = await EtherToken.deployed();
	const walletFactory = await WalletFactory.deployed();
	const supplyInterestRateStorage = await SupplyInterestRateStorage.deployed();
	const borrowInterestRateStorage = await BorrowInterestRateStorage.deployed();
	const ledgerStorage = await LedgerStorage.deployed();
	const borrowStorage = await BorrowStorage.deployed();
	const priceOracle = await PriceOracle.deployed();
	const tokenStore = await TokenStore.deployed();

	const tokens = {
		[etherToken.address]: "eth"
	};
	var tokenFactoryAddress;

	try {
		const facuetTokenBAT = await FaucetTokenBAT.deployed();
		tokens[facuetTokenBAT.address] = "bat";

		const facuetTokenDRGN = await FaucetTokenDRGN.deployed();
		tokens[facuetTokenDRGN.address] = "drgn";

		const facuetTokenOMG = await FaucetTokenOMG.deployed();
		tokens[facuetTokenOMG.address] = "omg";

		const facuetTokenZRX = await FaucetTokenZRX.deployed();
		tokens[facuetTokenZRX.address] = "zrx";
	} catch (e) {
		// Faucet tokens not deployed
	}

	try {
		tokenFactoryAddress = (await TokenFactory.deployed()).address;
	} catch (e) {
		// TokenFactory not deployed
	}

	process.stderr.write(JSON.stringify(
		{
			"money_market": moneyMarket.address,
			"wallet_factory": walletFactory.address,
			"ether_token": etherToken.address,
			"tokens": tokens,
			"token_factory": tokenFactoryAddress,
			"supply_interest_rate_storage": supplyInterestRateStorage.address,
			"borrow_interest_rate_storage": borrowInterestRateStorage.address,
			"ledger_storage": ledgerStorage.address,
			"borrow_storage": borrowStorage.address,
			"price_oracle": priceOracle.address,
			"token_store": tokenStore.address,
		}
	));

	callback();
}
