const BigNumber = require('bignumber.js');
const Vault = artifacts.require("./Vault.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');

const LedgerType = {
  Debit: web3.toBigNumber(0),
  Credit: web3.toBigNumber(1)
};

const LedgerReason = {
  CustomerDeposit: web3.toBigNumber(0),
  CustomerWithdrawal: web3.toBigNumber(1),
  Interest: web3.toBigNumber(2),
  CustomerBorrow: web3.toBigNumber(3),
  CustomerPayLoan: web3.toBigNumber(4),
};

const LedgerAccount = {
  Cash: web3.toBigNumber(0),
  Loan: web3.toBigNumber(1),
  Deposit: web3.toBigNumber(2),
  InterestExpense: web3.toBigNumber(3),
  InterestIncome: web3.toBigNumber(4)
};

contract('Vault', function(accounts) {
  var vault;
  var etherToken;

  beforeEach(async () => {
    [vault, etherToken] = await Promise.all([Vault.new(2), EtherToken.new()]);
    await vault.setAssetValue(etherToken.address, 1);
    await vault.addLoanableAsset(etherToken.address);
  });

  describe('#customerBorrow', () => {
    it("pays out the amount requested", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.assertEvents(vault, [
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerBorrow,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Loan,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('20'),
            balance: web3.toBigNumber('20'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerBorrow,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.Deposit,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('20'),
            balance: web3.toBigNumber('120'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        }
      ]);
    });
  });

  describe('#customerPayLoan', () => {
    it("accrues interest and reduces the balance", async () => {
      await vault.setInterestRate(etherToken.address, 50000, {from: web3.eth.accounts[0]});
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.increaseTime(web3, moment(0).add(2, 'years').unix());
      await vault.customerPayLoan(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await utils.assertEvents(vault, [
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.Interest,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.InterestIncome,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('80785'),
            balance: web3.toBigNumber('0'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.Interest,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Loan,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('80785'),
            balance: web3.toBigNumber('80805'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerPayLoan,
            ledgerType: LedgerType.Credit,
            ledgerAccount: LedgerAccount.Loan,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('20'),
            balance: web3.toBigNumber('80785'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        },
        {
          event: "LedgerEntry",
          args: {
            ledgerReason: LedgerReason.CustomerPayLoan,
            ledgerType: LedgerType.Debit,
            ledgerAccount: LedgerAccount.Deposit,
            customer: web3.eth.accounts[1],
            asset: etherToken.address,
            amount: web3.toBigNumber('20'),
            balance: web3.toBigNumber('100'),
            interestRateBPS: web3.toBigNumber('0'),
            nextPaymentDate: web3.toBigNumber('0')
          }
        }
      ]);
    });
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
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.newLoan(etherToken.address, 20, {from: web3.eth.accounts[1]});

      const loan = await vault.getLoan.call(web3.eth.accounts[1]);

      utils.assertMatchingArray(loan, [
        20,
        20,
        etherToken.address,
        web3.eth.accounts[1],
      ]);
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
