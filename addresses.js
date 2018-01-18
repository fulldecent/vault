var Vault = artifacts.require("./Vault.sol");
var EtherToken = artifacts.require("./tokens/EtherToken.sol");
var PigToken = artifacts.require("./tokens/PigToken.sol");
var WalletFactory = artifacts.require("./WalletFactory.sol");
var TokenFactory = artifacts.require("./TokenFactory.sol");

var SavingsInterestRateStorage = artifacts.require("./storage/BorrowInterestRateStorage.sol");
var BorrowInterestRateStorage = artifacts.require("./storage/BorrowInterestRateStorage.sol");
var LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
var LoanerStorage = artifacts.require("./storage/LoanerStorage.sol");
var Oracle = artifacts.require("./storage/Oracle.sol");
var TokenStore = artifacts.require("./storage/TokenStore.sol");

module.exports = async function(callback) {
	const vault = await Vault.deployed();
	const etherToken = await EtherToken.deployed();
	const walletFactory = await WalletFactory.deployed();
	const savingsInterestRateStorage = await SavingsInterestRateStorage.deployed();
	const borrowInterestRateStorage = await BorrowInterestRateStorage.deployed();
	const ledgerStorage = await LedgerStorage.deployed();
	const loanerStorage = await LoanerStorage.deployed();
	const oracle = await Oracle.deployed();
	const tokenStore = await TokenStore.deployed();

	const tokens = {
		[etherToken.address]: "eth"
	};
	var tokenFactoryAddress;

	try {
		const pigToken = await PigToken.deployed();
		tokens[pigToken.address] = "pig";
	} catch (e) {
		// Pig token not deployed
	}

	try {
		tokenFactoryAddress = (await TokenFactory.deployed()).address;
	} catch (e) {
		// TokenFactory not deployed
	}

	process.stderr.write(JSON.stringify(
		{
			"vault": vault.address,
			"wallet_factory": walletFactory.address,
			"ether_token": etherToken.address,
			"tokens": tokens,
			"token_factory": tokenFactoryAddress,
			"savings_interest_rate_storage": savingsInterestRateStorage.address,
			"borrow_interest_rate_storage": borrowInterestRateStorage.address,
			"ledger_storage": ledgerStorage.address,
			"loaner_storage": loanerStorage.address,
			"oracle": oracle.address,
			"token_store": tokenStore.address,
		}
	));

	callback();
}
