const BigNumber = require('bignumber.js');
const WalletFactory = artifacts.require("./WalletFactory.sol");
const Wallet = artifacts.require("./Wallet.sol");
const Vault = artifacts.require("./Vault.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('WalletFactory', function(accounts) {
  var walletFactory;
  var vault;
  var etherToken;
  var tokenStore;

  beforeEach(async () => {
    tokenStore = await TokenStore.new();
    ledgerStorage = await LedgerStorage.new();
    [vault, etherToken] = await Promise.all([Vault.new(), EtherToken.new()]);

    await tokenStore.allow(vault.address);
    await vault.setTokenStore(tokenStore.address);

    await ledgerStorage.allow(vault.address);
    await vault.setLedgerStorage(ledgerStorage.address);

    walletFactory = await WalletFactory.new(vault.address, etherToken.address);
  });

  describe("#newWallet", () => {
    it.only("should create a new wallet", async () => {
      // Find out where wallet will be created
      const walletAddress = (await walletFactory.newWallet.call(web3.eth.accounts[1], {from: web3.eth.accounts[0]})).valueOf();

      // Actually create the wallet
      await walletFactory.newWallet(web3.eth.accounts[1], {from: web3.eth.accounts[0]});

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

    it.skip("should only work if by wallet factory owner", async () => {
      await utils.assertOnlyOwner(wallet, wallet.newWallet.bind(null, web3.eth.accounts[1]), web3);
    });

    it("should be owned by set owner", async () => {
      // Find out where wallet will be created
      const walletAddress = (await walletFactory.newWallet.call(web3.eth.accounts[1], {from: web3.eth.accounts[0]})).valueOf();

      // Actually create the wallet
      await walletFactory.newWallet(web3.eth.accounts[1], {from: web3.eth.accounts[0]});

      // Make a Wallet variable pointed at the address from above
      const wallet = Wallet.at(walletAddress);

      // Deposit eth into wallet
      await wallet.depositEth({from: web3.eth.accounts[1], value: 55});

      await utils.assertOnlyOwner(wallet, wallet.withdrawEth.bind(null, 22, web3.eth.accounts[1]), web3.eth.accounts[1], web3.eth.accounts[2]);
    });

    it("should emit new wallet event", async () => {
      // Find out where wallet will be created
      const walletAddress = (await walletFactory.newWallet.call(web3.eth.accounts[1], {from: web3.eth.accounts[0]})).valueOf();

      // Actually create the wallet
      await walletFactory.newWallet(web3.eth.accounts[1], {from: web3.eth.accounts[0]});

      await utils.assertEvents(walletFactory, [
      {
        event: "NewWallet",
        args: {
          walletOwner: web3.eth.accounts[1],
          newWalletAddress: walletAddress
        }
      }]);
    });
  });
});
