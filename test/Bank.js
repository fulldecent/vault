const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Bank', function(accounts) {
  var bank;
  var etherToken;

  beforeEach(async () => {
    [bank, etherToken] = await Promise.all([Bank.new(), EtherToken.new()]);
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
