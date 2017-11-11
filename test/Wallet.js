const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const Wallet = artifacts.require("./Wallet.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Wallet', function(accounts) {
  var wallet;
  var bank;
  var etherToken;

  beforeEach(function() {
    return Bank.new().then((instance) => {
      bank = instance;

      return EtherToken.new().then((instance) => {
        etherToken = instance;

        return Wallet.new(web3.eth.accounts[1], bank.address, etherToken.address).then((instance) => {
          wallet = instance;
        });
      });
    });
  });

  // TODO: #fallback

  describe('#depositEth', () => {
    it('should deposit assets in bank', async () => {
      await wallet.sendTransaction({value: 55});

      // verify balance in ledger
      const balance = await bank.getAccountBalanceRaw(wallet.address, etherToken.address);
      assert.equal(balance.valueOf(), 55);

      // verify balances in W-Eth
      assert.equal((await etherToken.balanceOf(bank.address)).valueOf(), 55);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 0);
    });
  });

  // TODO: #depositAsset

  describe('#withdrawEth', () => {
    it('should withdraw assets from bank', async () => {
      var randomAcct = (await EtherToken.new()).address; // simple way to create new contract

      // fill initial balance
      await wallet.sendTransaction({value: 55});

      // verify account eth
      const ethBalanceStart = (await web3.eth.getBalance(randomAcct)).valueOf();

      // withdraw eth
      await wallet.withdrawEth(22, randomAcct, {from: web3.eth.accounts[1]});

      // verify account eth
      const ethBalanceEnd = (await web3.eth.getBalance(randomAcct)).valueOf();
      assert.equal(ethBalanceStart - ethBalanceEnd, 21);

      // verify balance in ledger
      const balance = await bank.getAccountBalanceRaw(wallet.address, etherToken.address);
      assert.equal(balance.valueOf(), 32);

      // verify balances in W-Eth
      assert.equal((await etherToken.balanceOf(bank.address)).valueOf(), 32);
      assert.equal((await etherToken.balanceOf(web3.eth.accounts[1])).valueOf(), 0);
    });
  });

  // TODO: #withdrawAsset
});
