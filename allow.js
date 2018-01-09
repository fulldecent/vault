var Vault = artifacts.require("./Vault.sol");

var InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
var LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
var LoanerStorage = artifacts.require("./storage/LoanerStorage.sol");
var Oracle = artifacts.require("./storage/Oracle.sol");
var TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
	const vault = await Vault.deployed();
	const interestRateStorage = await InterestRateStorage.deployed();
	const ledgerStorage = await LedgerStorage.deployed();
	const loanerStorage = await LoanerStorage.deployed();
	const oracle = await Oracle.deployed();
	const tokenStore = await TokenStore.deployed();

	return await Promise.all([
		interestRateStorage.allow(vault.address),
		ledgerStorage.allow(vault.address),
		loanerStorage.allow(vault.address),
		oracle.allow(vault.address),
		tokenStore.allow(vault.address)
	]);
};