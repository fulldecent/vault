var MoneyMarket = artifacts.require("./MoneyMarket.sol");

var InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
var LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
var BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
var PriceOracle = artifacts.require("./storage/PriceOracle.sol");
var TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
	const moneyMarket = await MoneyMarket.deployed();

	console.log("Allowing to " + moneyMarket.address);

	const interestRateStorage = await InterestRateStorage.deployed();
	const ledgerStorage = await LedgerStorage.deployed();
	const borrowStorage = await BorrowStorage.deployed();
	const priceOracle = await PriceOracle.deployed();
	const tokenStore = await TokenStore.deployed();

	await Promise.all([
		interestRateStorage.allow(moneyMarket.address),
		ledgerStorage.allow(moneyMarket.address),
		borrowStorage.allow(moneyMarket.address),
		priceOracle.allow(moneyMarket.address),
		tokenStore.allow(moneyMarket.address)
	]);

	console.log("All has been allowed to " + moneyMarket.address);

	callback();
};