const BigNumber = require('bignumber.js');
const Vault = artifacts.require("./Vault.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

async function evmRevert(web3) {
  // if(web3){
  //   console.log("revertin!");
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_revert",
        id: new Date().getTime()
      }, (err, result) => {
        if(err){ return reject(err) }
        return resolve(result)
      });
    });
  // }
}

contract('Vault', function(accounts) {
  var vault;
  var etherToken;

  beforeEach(async () => {
    [vault, etherToken] = await Promise.all([Vault.new(2), EtherToken.new()]);
    await vault.setAssetValue(etherToken.address, 1);
    await vault.addLoanableAsset(etherToken.address);
  });

  afterEach(async () => {
    await evmRevert(web3);
  })

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

  describe('#getLoanByLessee', () => {
    it("returns a loan", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.newLoan(etherToken.address, 20, 24, {from: web3.eth.accounts[1]});

      const loan = await vault.getLoanByLessee.call(web3.eth.accounts[1], 0);
      assert.equal(loan[0], 20);
      assert.equal(loan[1], 20);
      assert.equal(loan[2], 24);
      assert.closeTo(loan[3].toNumber(), moment().unix(), 5)
      assert.equal(loan[4], etherToken.address);
      assert.equal(loan[5], web3.eth.accounts[1]);
    });
  });

  describe('#getLoanPayment', () => {
    it("returns the loan payment amount", async () => {
      const loanAmount = web3.toWei("4", "ether");
      const loanLengthInWeeks = 8;
      const payments = loanLengthInWeeks / 2;
      await utils.depositEth(vault, etherToken, loanAmount * 2, web3.eth.accounts[1]);
      await vault.newLoan(etherToken.address, loanAmount, loanLengthInWeeks, {from: web3.eth.accounts[1]});

      assert.equal((await(vault.getLoanPayment.call(0))).toNumber(), web3.toWei("1", "ether"));
    });
  });

  describe('#getLoan', () => {
    it.only("returns a loan", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.newLoan(etherToken.address, 20, 24, {from: web3.eth.accounts[1]});
      await vault.newLoan(etherToken.address, 40, 24, {from: web3.eth.accounts[1]});

      const loan = await vault.getLoan.call(1);

      assert.equal(loan[0], 40);
      assert.equal(loan[1], 40);
      assert.equal(loan[2], 24);
      assert.closeTo(loan[3].toNumber(), moment().unix(), 5)
      assert.equal(loan[4], etherToken.address);
      assert.equal(loan[5], web3.eth.accounts[1]);
    });
  });

  describe('#getLength', () => {
    it("returns the loan length", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.newLoan(etherToken.address, 20, 24, {from: web3.eth.accounts[1]});
      await vault.newLoan(etherToken.address, 40, 24, {from: web3.eth.accounts[1]});

      const loanLength = await vault.getLoansLength.call(web3.eth.accounts[1], 0);

      assert.equal(loanLength, 2);
    });
  });

  describe('#newLoan', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
        // Check return value
        const amountLoaned = await vault.newLoan.call(etherToken.address, 20, 24, {from: web3.eth.accounts[1]});
        assert.equal(amountLoaned.valueOf(), 0);

        // Call actual function
        await vault.newLoan(etherToken.address, 20, 24, {from: web3.eth.accounts[1]});

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, vault.address), 80);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 20);
      });
    });

    describe("when the user doesn't have enough collateral deposited", () => {
      it("fails", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

        await utils.assertFailure("VM Exception while processing transaction: revert", async () => {
          await vault.newLoan(etherToken.address, 201, 24, {from: web3.eth.accounts[0]});
        });
      });
    });
  });

  describe("when the user tries to take a loan out of an unsupported asset", () => {
    it("fails", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

      await utils.assertFailure("VM Exception while processing transaction: revert", async () => {
        await vault.newLoan(utils.tokenAddrs.OMG, 50, 24, {from: web3.eth.accounts[0]});
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

  describe('#payLoan', () => {
    it("should decrease the loan balance", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      const loanId = (await vault.newLoan.call(etherToken.address, 20, 24, {from: web3.eth.accounts[1]})).toNumber();
      await vault.newLoan(etherToken.address, 20, 24, {from: web3.eth.accounts[1]})

      await vault.payLoan(web3.eth.accounts[1], loanId);
      const loan = await vault.getLoanByLessee.call(web3.eth.accounts[1], 0);
      assert.equal(loan[0], 19);
      assert.equal(loan[1], 20);
      assert.equal(loan[2], 24);
      assert.closeTo(loan[3].toNumber(), moment().unix(), 5)
      assert.equal(loan[4], etherToken.address);
      assert.equal(loan[5], web3.eth.accounts[1]);
    });

    it("should decrease the user's balance", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      const loanId = (await vault.newLoan.call(etherToken.address, 20, 24, {from: web3.eth.accounts[1]})).toNumber();
      await vault.newLoan(etherToken.address, 20, 24, {from: web3.eth.accounts[1]})

      await vault.payLoan(web3.eth.accounts[1], loanId);
      const loan = await vault.getLoanByLessee.call(web3.eth.accounts[1], 0);
      assert.equal(await utils.ledgerAccountBalance(vault, web3.eth.accounts[1], etherToken.address), 99);
        await utils.assertEvents(vault, [
        {
          event: "LedgerEntry",
          args: {
            account: vault.address,
            asset: etherToken.address,
            debit: web3.toBigNumber('1')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            account: web3.eth.accounts[1],
            asset: etherToken.address,
            credit: web3.toBigNumber('1')
          }
        },
        ]);
    });
  });

  it("sets the owner", async () => {
    const owner = await vault.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });
});
