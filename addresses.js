var Vault = artifacts.require("./Vault.sol");
var EtherToken = artifacts.require("./tokens/EtherToken.sol");
var WalletFactory = artifacts.require("./WalletFactory.sol");

module.exports = async function(callback) {
	const vault = await Vault.deployed();
	const etherToken = await EtherToken.deployed();
	const walletFactory = await WalletFactory.deployed();

	process.stderr.write(vault.address + "," + etherToken.address + "," + walletFactory.address);

	callback();
}
