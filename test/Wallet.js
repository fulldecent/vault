const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const PigToken = artifacts.require("./token/PigToken.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const Wallet = artifacts.require("./Wallet.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Wallet', function(accounts) {
  var wallet;
  var bank;
  var etherToken;
  var pigToken;

  beforeEach(function() {
    return Bank.new().then((instance) => {
      bank = instance;

      return EtherToken.new().then((instance) => {
        etherToken = instance;

        return PigToken.new().then((instance) => {
          pigToken = instance;

          return Wallet.new(web3.eth.accounts[1], bank.address, etherToken.address).then((instance) => {
            wallet = instance;
          });
        });
      });
    });
  });

  // TODO: #fallback

  describe('#depositEth / fallback', () => {
    it('fallback should deposit assets in bank', async () => {
      await wallet.sendTransaction({value: 55});

      // verify balance in ledger
      const balance = await bank.getAccountBalanceRaw(wallet.address, etherToken.address);
      assert.equal(balance.valueOf(), 55);

      // verify balances in W-Eth
      assert.equal((await etherToken.balanceOf(bank.address)).valueOf(), 55);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 0);
    });

    it('depositEth should deposit assets in bank', async () => {
      await wallet.depositEth({value: 55});

      // verify balance in ledger
      const balance = await bank.getAccountBalanceRaw(wallet.address, etherToken.address);
      assert.equal(balance.valueOf(), 55);

      // verify balances in W-Eth
      assert.equal((await etherToken.balanceOf(bank.address)).valueOf(), 55);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 0);
    });
  });

  describe('#depositAsset', () => {
    it('should deposit assets in bank', async () => {
      // Allocate 100 pig tokens to account 1
      pigToken.allocate(web3.eth.accounts[1], 100);

      // Approve wallet for 55 tokens
      pigToken.approve(wallet.address, 55, {from: web3.eth.accounts[1]});

      // Verify initial state
      assert.equal((await pigToken.balanceOf(bank.address)).valueOf(), 0);
      assert.equal((await pigToken.balanceOf(web3.eth.accounts[1])).valueOf(), 100);

      // Deposit those tokens
      await wallet.depositAsset(pigToken.address, 55, {from: web3.eth.accounts[1]});

      // verify balance in ledger
      const balance = await bank.getAccountBalanceRaw(wallet.address, pigToken.address);
      assert.equal(balance.valueOf(), 55);

      // verify balances in PigToken
      assert.equal((await pigToken.balanceOf(bank.address)).valueOf(), 55);
      assert.equal((await pigToken.balanceOf(web3.eth.accounts[1])).valueOf(), 45);
    });
  });

  describe('#withdrawEth', () => {
    it('should withdraw assets from bank', async () => {
      // fill initial balance
      await wallet.sendTransaction({value: 55});

      // verify account eth
      const ethBalanceStart = web3.toBigNumber((await web3.eth.getBalance(web3.eth.accounts[2])).valueOf());

      // withdraw eth
      await wallet.withdrawEth(22, web3.eth.accounts[2], {from: web3.eth.accounts[1]});

      // verify account eth
      const ethBalanceEnd = web3.toBigNumber((await web3.eth.getBalance(web3.eth.accounts[2])).valueOf());
      assert.equal(ethBalanceEnd.minus(ethBalanceStart).toNumber(), 22);

      // verify balance in ledger
      const balance = await bank.getAccountBalanceRaw(wallet.address, etherToken.address);
      assert.equal(balance.valueOf(), 33);

      // verify balances in W-Eth
      assert.equal((await etherToken.balanceOf(bank.address)).valueOf(), 33);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 0);
    });
  });

  describe('#withdrawEth', () => {
    it('should withdraw assets from bank', async () => {
      // Allocate 100 pig tokens to account 1
      pigToken.allocate(web3.eth.accounts[1], 100);

      // Approve wallet for 55 tokens
      pigToken.approve(wallet.address, 55, {from: web3.eth.accounts[1]});

      // Deposit those tokens
      await wallet.depositAsset(pigToken.address, 55, {from: web3.eth.accounts[1]});

      // Withdraw to different address
      await wallet.withdrawAsset(pigToken.address, 33, web3.eth.accounts[2], {from: web3.eth.accounts[1]});

      // verify balances in PigToken
      assert.equal((await pigToken.balanceOf(bank.address)).valueOf(), 22);
      assert.equal((await pigToken.balanceOf(web3.eth.accounts[1])).valueOf(), 45);
      assert.equal((await pigToken.balanceOf(web3.eth.accounts[2])).valueOf(), 33);
    });
  });
});
