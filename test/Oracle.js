const Oracle = artifacts.require("./Oracle.sol");
const utils = require('./utils');
const moment = require('moment');
const tokenAddrs = utils.tokenAddrs;
const toAssetValue = (value) => (value * 10 ** 9);

contract('Oracle', function(accounts) {
  var oracle;

  beforeEach(async () => {
    oracle = await Oracle.new(null, {from: accounts[0]});
  });

  describe('#setAssetValue', () => {
    it("should set the asset's given value", async () => {
      await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(15) , {from: web3.eth.accounts[0]});
      const balance = await oracle.getAssetValue.call(tokenAddrs.OMG, 1);
      assert.equal(balance.valueOf(), 15);

      const assets = await oracle.getSupportedAssets.call();
      assert.equal(assets.valueOf().length, 1);
      assert.equal(assets.valueOf()[0], tokenAddrs.OMG);

      await utils.assertEvents(oracle, [
      {
        event: "NewAsset",
        args: {
          asset: tokenAddrs.OMG
        }
      },
      {
        event: "AssetValueUpdate",
        args: {
          asset: tokenAddrs.OMG,
          valueInWei: web3.toBigNumber('15000000000')
        }
      },
      ]);

      await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(0.01) , {from: web3.eth.accounts[0]});
      const balance_2 = await oracle.getAssetValue.call(tokenAddrs.OMG, 1000);
      assert.equal(balance_2.valueOf(), 10);

      const assets_2 = await oracle.getSupportedAssets.call();
      assert.equal(assets_2.valueOf().length, 1);
      assert.equal(assets_2.valueOf()[0], tokenAddrs.OMG);
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
        const balance = await oracle.getAssetValue.call(tokenAddrs.BAT, 1);
        assert.equal(balance.valueOf(), 0);
      });
    });
  });
});
