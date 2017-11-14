const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const PigToken = artifacts.require("./token/PigToken.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const Wallet = artifacts.require("./Wallet.sol");
const utils = require('./utils');
const moment = require('moment');

async function depositEth(wallet, amount, account) {
  await wallet.sendTransaction({value: amount, from: account});
}

async function withdrawEth(wallet, amount, account, to) {
  await wallet.withdrawEth(amount, to, {from: account});
}

async function depositAsset(wallet, token, amount, account) {
  // Approve wallet for amount tokens
  await token.approve(wallet.address, amount, {from: account});

  // Deposit those tokens
  await wallet.depositAsset(token.address, amount, {from: account});
}

async function withdrawAsset(wallet, token, amount, account, to) {
  await wallet.withdrawAsset(token.address, amount, to, {from: account});
}

contract('Wallet', function(accounts) {
  var wallet;
  var bank;
  var etherToken;
  var pigToken;

  beforeEach(async () => {
    [bank, etherToken, pigToken] = await Promise.all([Bank.new(), EtherToken.new(), PigToken.new()]);

    wallet = await Wallet.new(web3.eth.accounts[1], bank.address, etherToken.address);
  });

  describe('#depositEth / fallback', () => {
    it('#fallback should deposit assets in bank', async () => {
      await wallet.sendTransaction({value: 55});

      // verify balance in ledger
      assert.equal(await utils.ledgerAccountBalance(bank, wallet.address, etherToken.address), 55);

      // verify balances in W-Eth
      assert.equal(await utils.tokenBalance(etherToken, bank.address), 55);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 0);
    });

    it('#depositEth should deposit assets in bank', async () => {
      await wallet.depositEth({value: 55});

      // verify balance in ledger
      assert.equal(await utils.ledgerAccountBalance(bank, wallet.address, etherToken.address), 55);

      // verify balances in W-Eth
      assert.equal(await utils.tokenBalance(etherToken, bank.address), 55);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 0);
    });
  });

  describe('#depositAsset', () => {
    it('should deposit assets in bank', async () => {
      // Allocate 100 pig tokens to account 1
      await pigToken.allocate(web3.eth.accounts[1], 100);

      // Approve wallet for 55 tokens
      await pigToken.approve(wallet.address, 55, {from: web3.eth.accounts[1]});

      // Verify initial state
      assert.equal(await utils.tokenBalance(pigToken, bank.address), 0);
      assert.equal(await utils.tokenBalance(pigToken, web3.eth.accounts[1]), 100);

      // Deposit those tokens
      await wallet.depositAsset(pigToken.address, 55, {from: web3.eth.accounts[1]});

      // verify balance in ledger
      assert.equal(await utils.ledgerAccountBalance(bank, wallet.address, pigToken.address), 55);

      // verify balances in PigToken
      assert.equal(await utils.tokenBalance(pigToken, bank.address), 55);
      assert.equal(await utils.tokenBalance(pigToken, web3.eth.accounts[1]), 45);
    });

    it('should leave a Deposit event');
    it('should accept deposits from third party');
  });

  describe('#withdrawEth', () => {
    it('should withdraw assets from bank', async () => {
      // fill initial balance
      await wallet.sendTransaction({value: 55});

      // verify balance in ledger
      assert.equal(await utils.ledgerAccountBalance(bank, wallet.address, etherToken.address), 55);

      await utils.assertDifference(assert, 22, async () => {
        // get eth balance
        return await utils.ethBalance(web3.eth.accounts[2]);
      }, async () => {
        // withdraw eth
        return await wallet.withdrawEth(22, web3.eth.accounts[2], {from: web3.eth.accounts[1]});
      });

      // verify balance in ledger
      assert.equal(await utils.ledgerAccountBalance(bank, wallet.address, etherToken.address), 33);

      // verify balances in W-Eth
      assert.equal(await utils.tokenBalance(etherToken, bank.address), 33);
      assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 0);
    });

    it('should log Withdrawal event');
    it('should fail on third party calls');
  });

  describe('#withdrawAsset', () => {
    it('should withdraw assets from bank', async () => {
      // Allocate 100 pig tokens to account 1
      await pigToken.allocate(web3.eth.accounts[1], 100);

      // Approve wallet for 55 tokens
      await pigToken.approve(wallet.address, 55, {from: web3.eth.accounts[1]});

      // Deposit those tokens
      await wallet.depositAsset(pigToken.address, 55, {from: web3.eth.accounts[1]});

      // Withdraw to different address
      await wallet.withdrawAsset(pigToken.address, 33, web3.eth.accounts[2], {from: web3.eth.accounts[1]});

      // verify balances in PigToken
      assert.equal(await utils.tokenBalance(pigToken, bank.address), 22);
      assert.equal(await utils.tokenBalance(pigToken, web3.eth.accounts[1]), 45);
      assert.equal(await utils.tokenBalance(pigToken, web3.eth.accounts[2]), 33);
    });

    it('should log Withdrawal event');
    it('should fail on third party calls');
  });

  describe('#balanceEth', () => {
    it('should have correct balance', async () => {
      await depositEth(wallet, 22, web3.eth.accounts[1]);

      assert.equal((await wallet.balanceEth.call()).valueOf(), 22);

      await depositEth(wallet, 11, web3.eth.accounts[1]);

      assert.equal((await wallet.balanceEth.call()).valueOf(), 33);

      await withdrawEth(wallet, 3, web3.eth.accounts[1], web3.eth.accounts[2]);

      assert.equal((await wallet.balanceEth.call()).valueOf(), 30);
    });

    it('should allow third party calls');
  });

  describe('#balance', () => {
    it('should have correct asset balance', async () => {
      // Allocate 100 pig tokens to account 1
      await pigToken.allocate(web3.eth.accounts[1], 100);

      await depositAsset(wallet, pigToken, 22, web3.eth.accounts[1]);

      assert.equal((await wallet.balance.call(pigToken.address)).valueOf(), 22);

      await depositAsset(wallet, pigToken, 11, web3.eth.accounts[1]);

      assert.equal((await wallet.balance.call(pigToken.address)).valueOf(), 33);

      await withdrawAsset(wallet, pigToken, 3, web3.eth.accounts[1], web3.eth.accounts[2]);

      assert.equal((await wallet.balance.call(pigToken.address)).valueOf(), 30);
    });

    it('should allow third party calls');
  });
});
