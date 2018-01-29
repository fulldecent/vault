var MoneyMarket = artifacts.require("./MoneyMarket.sol");

var BorrowInterestRateStorage = artifacts.require("./storage/BorrowInterestRateStorage.sol");
var SupplyInterestRateStorage = artifacts.require("./storage/SupplyInterestRateStorage.sol");
var LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
var BorrowStorage = artifacts.require("./storage/BorrowStorage.sol");
var PriceOracle = artifacts.require("./storage/PriceOracle.sol");
var TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
	const moneyMarket = await MoneyMarket.deployed();
	const borrowInterestRateStorage = await BorrowInterestRateStorage.deployed();
	const supplyInterestRateStorage = await SupplyInterestRateStorage.deployed();
	const ledgerStorage = await LedgerStorage.deployed();
	const borrowStorage = await BorrowStorage.deployed();
	const priceOracle = await PriceOracle.deployed();
	const tokenStore = await TokenStore.deployed();

	return await Promise.all([
		borrowInterestRateStorage.allow(moneyMarket.address),
		supplyInterestRateStorage.allow(moneyMarket.address),
		ledgerStorage.allow(moneyMarket.address),
		borrowStorage.allow(moneyMarket.address),
		priceOracle.allow(moneyMarket.address),
		tokenStore.allow(moneyMarket.address)
	]);
};