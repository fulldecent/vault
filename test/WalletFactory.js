"use strict";

const BigNumber = require('bignumber.js');
const WalletFactory = artifacts.require("./WalletFactory.sol");
const Wallet = artifacts.require("./Wallet.sol");
const MoneyMarket = artifacts.require("./MoneyMarket.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const InterestModel = artifacts.require("./InterestModel.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('WalletFactory', function(accounts) {
  var walletFactory;
  var moneyMarket;
  var etherToken;
  var tokenStore;

  beforeEach(async () => {
    tokenStore = await TokenStore.new();
    const ledgerStorage = await LedgerStorage.new();
    const interestRateStorage = await InterestRateStorage.new();
    const interestModel = await InterestModel.new();
    [moneyMarket, etherToken] = await Promise.all([MoneyMarket.new(), EtherToken.new()]);

    await tokenStore.allow(moneyMarket.address);
    await moneyMarket.setTokenStore(tokenStore.address);

    await ledgerStorage.allow(moneyMarket.address);
    await moneyMarket.setLedgerStorage(ledgerStorage.address);

    await interestRateStorage.allow(moneyMarket.address);
    await moneyMarket.setInterestRateStorage(interestRateStorage.address);

    await moneyMarket.setInterestModel(interestModel.address);

    walletFactory = await WalletFactory.new(moneyMarket.address, etherToken.address);
  });

  describe("#newWallet", () => {
    it("should create a new wallet", async () => {
      // Find out where wallet will be created
      const walletAddress = (await walletFactory.newWallet.call(web3.eth.accounts[1], {from: web3.eth.accounts[0]})).valueOf();

      // Actually create the wallet
      await walletFactory.newWallet(web3.eth.accounts[1], {from: web3.eth.accounts[0]});

      // Make a Wallet variable pointed at the address from above
      const wallet = Wallet.at(walletAddress);

      // Supply eth into wallet
      await wallet.supplyEth({from: web3.eth.accounts[1], value: 55});

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

      // Supply eth into wallet
      await wallet.supplyEth({from: web3.eth.accounts[1], value: 55});

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
