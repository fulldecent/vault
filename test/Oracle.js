"use strict";

const Oracle = artifacts.require("./storage/Oracle.sol");
const utils = require('./utils');
const moment = require('moment');
const tokenAddrs = utils.tokenAddrs;
const toAssetValue = (value) => (value * 10 ** 9);

contract('Oracle', function(accounts) {
  var oracle;

  beforeEach(async () => {
    oracle = await Oracle.new();
    await oracle.allow(web3.eth.accounts[0]);
  });

  describe('#setAssetValue', () => {
    it("should set the asset's given value and emit events", async () => {
      await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(15) , {from: web3.eth.accounts[0]});
      const balance = await oracle.getAssetValue.call(tokenAddrs.OMG, 1);
      assert.equal(balance.valueOf(), 15);

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
      await utils.assertOnlyOwner(oracle, oracle.setAssetValue.bind(null, tokenAddrs.OMG, web3.toWei(15, "ether")), web3);
    });
  });

  describe('#getAssetValue', async () => {
    describe('before it is set', () => {
      it("returns 0", async () => {
        const balance = await oracle.getAssetValue.call(tokenAddrs.BAT, 1);
        assert.equal(balance.valueOf(), 0);
      });
    });

    describe('after it is set', async () => {
      it("returns amount", async () => {
        await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(15) , {from: web3.eth.accounts[0]});
        const balance = await oracle.getAssetValue.call(tokenAddrs.OMG, 1);
        assert.equal(balance.valueOf(), 15);
      });
    });
  });

  describe('#getSupportedAssets', async () => {
    it('lists supported assets', async () => {
      await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(15) , {from: web3.eth.accounts[0]});
      const assets = await oracle.getSupportedAssets.call();
      assert.equal(assets.valueOf().length, 1);
      assert.equal(assets.valueOf()[0], tokenAddrs.OMG);
    });
  });

  describe('#getAssetsLength', async () => {
    describe('after it is set', async () => {
      it("returns the length", async () => {
        await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(15) , {from: web3.eth.accounts[0]});
        await oracle.setAssetValue(tokenAddrs.BAT, toAssetValue(17) , {from: web3.eth.accounts[0]});
        const length = await oracle.getAssetsLength.call();
        assert.equal(length.valueOf(), 2);
      });
    })
  });

  describe('#getConvertedAssetValue', async () => {
    describe('before either asset is set', () => {
      it("returns 0", async () => {
        const balance = await oracle.getConvertedAssetValue.call(tokenAddrs.BAT, 1, tokenAddrs.OMG);
        assert.equal(balance.valueOf(), 0);
      });
    });

    describe('before target asset value is set', () => {
      it("returns 0", async () => {
        await oracle.setAssetValue(tokenAddrs.BAT, toAssetValue(17) , {from: web3.eth.accounts[0]});
        const balance = await oracle.getConvertedAssetValue.call(tokenAddrs.BAT, 1, tokenAddrs.OMG);
        assert.equal(balance.valueOf(), 0);
      });
    });

    describe('before src asset value is set', () => {
      it("returns 0", async () => {
        await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(15) , {from: web3.eth.accounts[0]});
        const balance = await oracle.getConvertedAssetValue.call(tokenAddrs.BAT, 1, tokenAddrs.OMG);
        assert.equal(balance.valueOf(), 0);
      });
    });


    describe('conversion to a more valuable asset', async () => {
      it("returns amount", async () => {
        await oracle.setAssetValue(tokenAddrs.BAT, toAssetValue(2) , {from: web3.eth.accounts[0]});
        await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(5) , {from: web3.eth.accounts[0]});
        const balance = await oracle.getConvertedAssetValue.call(tokenAddrs.BAT, (10 ** 18), tokenAddrs.OMG);
        assert.equal(balance.valueOf(), 400000000000000000); // (1 * 10^18)*2/5
      });
    });

    describe('conversion to a less valuable asset', async () => {
      it("returns expected amount", async() => {
       // Asset1 = 5 * 10E19 (aka 50 Eth)
       // Asset2 = 2 * 10E19 (aka 20 Eth)
        await oracle.setAssetValue(tokenAddrs.BAT, toAssetValue(5) , {from: web3.eth.accounts[0]});
        await oracle.setAssetValue(tokenAddrs.OMG, toAssetValue(2) , {from: web3.eth.accounts[0]});
        const balance = await oracle.getConvertedAssetValue.call(tokenAddrs.BAT, (10 ** 18), tokenAddrs.OMG);
        assert.equal(balance.valueOf(), 2500000000000000000); // (1 * 10^18)*5/2
    });
    });
  });
});
