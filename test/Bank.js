const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Bank', function(accounts) {
  var bank;
  var etherToken;

  beforeEach(async () => {
    [bank, etherToken] = await Promise.all([Bank.new(2), EtherToken.new()]);
    await bank.setAssetValue(etherToken.address, 1);
  });

  describe('#newLoan', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        await utils.depositEth(bank, etherToken, 100, web3.eth.accounts[1]);
        // Check return value
        const amountLoaned = await bank.newLoan.call(etherToken.address, 20, {from: web3.eth.accounts[1]});
        assert.equal(amountLoaned.valueOf(), 20);

        // Call actual function
        await bank.newLoan(etherToken.address, 20, {from: web3.eth.accounts[1]});

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, bank.address), 80);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 20);
      });
    });

    describe("when the user doesn't have enough collateral deposited", () => {
      it("fails", async () => {
        await utils.createAndTransferWeth(bank.address, etherToken, 100, web3.eth.accounts[0]);

        await utils.assertFailure("VM Exception while processing transaction: revert", async () => {
          await bank.newLoan(etherToken.address, 201, {from: web3.eth.accounts[1]});
        });
      });
    });
  });
  describe('#getValueEquivalent', () => {
    it('should get value of assets', async () => {
      // deposit Ether tokens for acct 1
      await utils.depositEth(bank, etherToken, 100, web3.eth.accounts[1]);

      // set Eracle value (each Eth is now worth two Eth!)
      await bank.setAssetValue(etherToken.address, 2);

      // get value of acct 1
      const eqValue = await bank.getValueEquivalent.call(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 200);
    });
  });

  it("sets the owner", async () => {
    const owner = await bank.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });
});
