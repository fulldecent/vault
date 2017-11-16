const BigNumber = require('bignumber.js');
const Vault = artifacts.require("./Vault.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

contract('Vault', function(accounts) {
  var vault;
  var etherToken;

  beforeEach(async () => {
    [vault, etherToken] = await Promise.all([Vault.new(2), EtherToken.new()]);
    await vault.setAssetValue(etherToken.address, 1);
    await vault.addLoanableAsset(etherToken.address);
  });

  describe('#setMinimumCollateralRatio', () => {
    it('only can be called by the contract owner', async () => {
      await utils.assertOnlyOwner(vault.setMinimumCollateralRatio.bind(null, 1), web3);
    });
  });

  describe('#addLoanableAsset', () => {
    it('only can be called by the contract owner', async () => {
      await utils.assertOnlyOwner(vault.addLoanableAsset.bind(null, 1), web3);
    });
  });

  describe('#getLoan', () => {
    it("returns a loan", async () => {
      await utils.depositEth(bank, etherToken, 100, web3.eth.accounts[1]);
      await bank.newLoan(etherToken.address, 20, {from: web3.eth.accounts[1]});

      const loan = await bank.getLoan.call(web3.eth.accounts[1], 0);
      assert.equal(loan[0], 20);
      assert.equal(loan[1], 20);
      assert.equal(loan[2], etherToken.address);
      assert.equal(loan[3], web3.eth.accounts[1]);
    });
  });

  describe('#newLoan', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
        // Check return value
        const amountLoaned = await vault.newLoan.call(etherToken.address, 20, {from: web3.eth.accounts[1]});
        assert.equal(amountLoaned.valueOf(), 20);

        // Call actual function
        await vault.newLoan(etherToken.address, 20, {from: web3.eth.accounts[1]});

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, vault.address), 80);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 20);
      });
    });

    describe("when the user doesn't have enough collateral deposited", () => {
      it("fails", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

        await utils.assertFailure("VM Exception while processing transaction: revert", async () => {
          await vault.newLoan(etherToken.address, 201, {from: web3.eth.accounts[0]});
        });
      });
    });
  });

  describe("when the user tries to take a loan out of an unsupported asset", () => {
    it("fails", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

      await utils.assertFailure("VM Exception while processing transaction: revert", async () => {
        await vault.newLoan(utils.tokenAddrs.OMG, 50, {from: web3.eth.accounts[0]});
      });
    });
  });

  describe('#getValueEquivalent', () => {
    it('should get value of assets', async () => {
      // deposit Ether tokens for acct 1
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);

      // set Oracle value (each Eth is now worth two Eth!)
      await vault.setAssetValue(etherToken.address, 2);

      // get value of acct 1
      const eqValue = await vault.getValueEquivalent.call(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 200);
    });
  });

  it("sets the owner", async () => {
    const owner = await vault.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });
});
