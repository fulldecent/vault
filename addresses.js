var Vault = artifacts.require("./Vault.sol");
var EtherToken = artifacts.require("./tokens/EtherToken.sol");
var PigToken = artifacts.require("./tokens/PigToken.sol");
var WalletFactory = artifacts.require("./WalletFactory.sol");

module.exports = async function(callback) {
	const vault = await Vault.deployed();
	const etherToken = await EtherToken.deployed();
	const walletFactory = await WalletFactory.deployed();
	const tokens = {
		[etherToken.address]: "eth"
	};

	try {
		const pigToken = await PigToken.deployed();
		tokens[pigToken.address] = "pig";
	} catch (e) {
		// Pig token not deployed
	}

	process.stderr.write(JSON.stringify(
		{
			"vault": vault.address,
			"wallet_factory": walletFactory.address,
			"ether_token": etherToken.address,
			"tokens": tokens
		}
	));

	callback();
}
