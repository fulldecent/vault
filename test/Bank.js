const BigNumber = require('bignumber.js');
const Bank = artifacts.require("./Bank.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Bank', function(accounts) {
  var bank;
  var etherToken;

  beforeEach(function() {
    return Bank.new().then((instance) => {
      bank = instance;

      return EtherToken.new().then((instance) => {
        etherToken = instance;
      });
    });
  });

  describe('#getValueEquivalent', () => {
    it('should get value of assets', async () => {
      // deposit Ether tokens for acct 1
      await utils.deposit(bank, etherToken, web3.eth.accounts[1], 100);

      // set Eracle value (each Eth is now worth two Eth!)
      await bank.setAssetValue(etherToken.address, 2);

      // get value of acct 1
      const eqValue = await bank.getValueEquivalent.call(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 200);
    });
  })
});
