const Oracle = artifacts.require("./Oracle.sol");
const utils = require('./utils');
const moment = require('moment');

const tokenAddrs = {
  OMG: "0x0000000000000000000000000000000000000001",
  BAT: "0x0000000000000000000000000000000000000002"
}

contract('Oracle', function(accounts) {
  var oracle;

  beforeEach(function() {
    return Oracle.new(null, {from: accounts[0]}).then((instance) => {
      oracle = instance;
    });
  });

  describe('#setAssetValue', () => {
    it("should set the asset's given value", async () => {
      await oracle.setAssetValue(tokenAddrs.OMG, web3.toWei(15, "ether"), {from: web3.eth.accounts[0]});
      const balance = await oracle.getAssetValue.call(tokenAddrs.OMG);
      assert.equal(balance.valueOf(), 15000000000000000000);

      await utils.assertEvents(oracle, [
      {
        event: "AssetValueUpdate",
        args: {
          asset: tokenAddrs.OMG,
          valueInWei: web3.toBigNumber('15000000000000000000')
        }
      }])
    });

    it("should only allow owner to set asset value", async () => {
      try {
        await oracle.setAssetValue(tokenAddrs.OMG, web3.toWei(15, "ether"), {from: web3.eth.accounts[1]});
        assert.fail('should have thrown');
      } catch(error) {
        assert.equal(error.message, "VM Exception while processing transaction: revert")
      }
    });
  });

  describe('#getAssetValue', () => {
    describe('before it is set', () => {
      it("returns 0", async () => {
        const balance = await oracle.getAssetValue.call(tokenAddrs.BAT);
        assert.equal(balance.valueOf(), 0);
      });
    });
  });
});
