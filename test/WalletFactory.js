const BigNumber = require('bignumber.js');
const WalletFactory = artifacts.require("./WalletFactory.sol");
const Wallet = artifacts.require("./Wallet.sol");
const Bank = artifacts.require("./Bank.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Wallet', function(accounts) {
  var walletFactory;
  var bank;
  var etherToken;

  beforeEach(async () => {
    const [bank, etherToken] = await Promise.all([Bank.new(), EtherToken.new()]);

    walletFactory = await WalletFactory.new(bank.address, etherToken.address);
  });

  describe("#newWallet", () => {
    it("should create a new wallet", async () => {
      // Find out where wallet will be created
      const walletAddress = (await walletFactory.newWallet.call(web3.eth.accounts[1])).valueOf();

      // Actually create the wallet
      await walletFactory.newWallet(web3.eth.accounts[1]);

      // Make a Wallet variable pointed at the address from above
      const wallet = Wallet.at(walletAddress);

      // Deposit eth into wallet
      await wallet.depositEth({from: web3.eth.accounts[1], value: 55});

      // Verify balance
      assert.equal((await wallet.balanceEth.call()).valueOf(), 55);

      // Withdraw eth
      await wallet.withdrawEth(22, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      // Verify balance
      assert.equal((await wallet.balanceEth.call()).valueOf(), 33);
    });
  });
});