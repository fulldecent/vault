"use strict";

const BATToken = artifacts.require("./tokens/faucet_tokens/FaucetTokenBAT.sol");
const OMGToken = artifacts.require("./tokens/faucet_tokens/FaucetTokenOMG.sol");

const utils = require('./utils');

contract('FaucetTokenBAT', function(accounts) {
  var omgToken;
  var batToken;

  const omgPerRequestAmount = 60e18;

  beforeEach(async () => {
    [omgToken, batToken] = await Promise.all([OMGToken.new(), BATToken.new()]);

    await omgToken.setPerRequestTokenAmount(omgPerRequestAmount);
    // batToken is NOT configured- for negative testing
  });

  describe('#allocate', () => {

    it("should allocate configured amount of a token", async () => {
      await omgToken.allocate({from: web3.eth.accounts[1]});

      // verify balance
      assert.equal(await utils.tokenBalance(omgToken, web3.eth.accounts[1]), omgPerRequestAmount);
    });

    it("should disburse nothing for a non-configured token", async () => {
      // In addition to attempting an allocation that should do nothing, let's do a
      // non-limited allocateTo so we can wait for a non-zero balance.
      const allocatedAmount = 1e18;
      await(batToken.allocateTo(web3.eth.accounts[1], allocatedAmount));

      await utils.assertGracefulFailure(batToken, "FaucetToken::AssetNotDisbursable", [], async () => {
        await batToken.allocate({from: web3.eth.accounts[1]});
      });

      // verify balance matches allocatedAmount which shows (indirectly) that allocate did not do anything.
      await assert.equal(await(utils.tokenBalance(batToken, web3.eth.accounts[1])), allocatedAmount);
    });
  });

});
