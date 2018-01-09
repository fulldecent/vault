const BigNumber = require('bignumber.js');
const Vault = artifacts.require("./Vault.sol");
const LedgerStorage = artifacts.require("./storage/LedgerStorage.sol");
const LoanerStorage = artifacts.require("./storage/LoanerStorage.sol");
const InterestRateStorage = artifacts.require("./storage/InterestRateStorage.sol");
const TokenStore = artifacts.require("./storage/TokenStore.sol");
const Oracle = artifacts.require("./storage/Oracle.sol");
const PigToken = artifacts.require("./token/PigToken.sol");
const EtherToken = artifacts.require("./tokens/EtherToken.sol");
const utils = require('./utils');
const moment = require('moment');
const toAssetValue = (value) => (value * 10 ** 9);

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
  var interestRateStorage;
  var loanerStorage;
  var oracle;
  var ledgerStorage;
  var tokenStore;

  beforeEach(async () => {
    tokenStore = await TokenStore.new();
    interestRateStorage = await InterestRateStorage.new();
    ledgerStorage = await LedgerStorage.new();
    loanerStorage = await LoanerStorage.new();
    oracle = await Oracle.new();

    [vault, etherToken, pigToken] = await Promise.all([Vault.new(), EtherToken.new(), PigToken.new()]);

    await ledgerStorage.allow(vault.address);
    await loanerStorage.allow(vault.address);
    await loanerStorage.setMinimumCollateralRatio(2);
    await interestRateStorage.allow(vault.address);
    await oracle.allow(vault.address);
    await tokenStore.allow(vault.address);

    await vault.setLedgerStorage(ledgerStorage.address);
    await vault.setLoanerStorage(loanerStorage.address);
    await vault.setInterestRateStorage(interestRateStorage.address);
    await vault.setOracle(oracle.address);
    await vault.setTokenStore(tokenStore.address);

    await utils.setAssetValue(oracle, etherToken, 1, web3);
    await loanerStorage.addLoanableAsset(etherToken.address);
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
    it.skip("accrues interest and reduces the balance", async () => {
      await interestRateStorage.setInterestRate(etherToken.address, 50000, {from: web3.eth.accounts[0]});
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
            amount: web3.toBigNumber('2'),
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
            amount: web3.toBigNumber('2'),
            balance: web3.toBigNumber('22'),
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
            balance: web3.toBigNumber('2'),
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
      await utils.assertOnlyOwner(loanerStorage, loanerStorage.setMinimumCollateralRatio.bind(null, 1), web3);
    });
  });

  describe('#addLoanableAsset', () => {
    it('only can be called by the contract owner', async () => {
      await utils.assertOnlyOwner(loanerStorage, loanerStorage.addLoanableAsset.bind(null, 1), web3);
    });
  });

  describe('#customerBorrow', () => {
    describe('when the loan is valid', () => {
      it("pays out the amount requested", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
        await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
        await vault.customerWithdraw(etherToken.address, 20, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

        // verify balances in W-Eth
        assert.equal(await utils.tokenBalance(etherToken, tokenStore.address), 80);
        assert.equal(await utils.tokenBalance(etherToken, web3.eth.accounts[1]), 20);
      });
    });

    describe("when the user doesn't have enough collateral deposited", () => {
      it("fails", async () => {
        await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

        await utils.assertGracefulFailure(vault, "Loaner::InvalidCollateralRatio", [null, 201, 100], async () => {
          await vault.customerBorrow(etherToken.address, 201, {from: web3.eth.accounts[0]});
        });
      });
    });
  });

  describe("when the user tries to take a loan out of an unsupported asset", () => {
    it("fails", async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[0]);

      await utils.assertGracefulFailure(vault, "Loaner::AssetNotLoanable", [null], async () => {
        await vault.customerBorrow(utils.tokenAddrs.OMG, 50, {from: web3.eth.accounts[0]});
      });
    });
  });

  describe('#getMaxLoanAvailable', () => {
    it('gets the maximum loan available', async () => {
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      await vault.customerBorrow(etherToken.address, 20, {from: web3.eth.accounts[1]});
      await vault.customerWithdraw(etherToken.address, 20, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      const eqValue = await vault.getMaxLoanAvailable(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 160);
    });
  });

  describe('#getValueEquivalent', () => {
    it('should get value of assets', async () => {
      // deposit Ether tokens for acct 1
      await loanerStorage.addLoanableAsset(pigToken.address);
      await pigToken.allocate(web3.eth.accounts[0], 100);

      // // Approve wallet for 55 tokens
      await pigToken.approve(vault.address, 100, {from: web3.eth.accounts[0]});
      await vault.customerDeposit(pigToken.address, 100, web3.eth.accounts[0], {from: web3.eth.accounts[0]});
      await utils.depositEth(vault, etherToken, 100, web3.eth.accounts[1]);
      //
      // set Oracle value (each Eth is now worth two Eth!)
      await utils.setAssetValue(oracle, etherToken, 2, web3);
      await utils.setAssetValue(oracle, pigToken, 2, web3);
      await vault.customerBorrow(pigToken.address, 1, {from: web3.eth.accounts[1]});
      await vault.customerWithdraw(pigToken.address, 1, web3.eth.accounts[1], {from: web3.eth.accounts[1]});

      // get value of acct 1
      const eqValue = await vault.getValueEquivalent.call(web3.eth.accounts[1]);
      await vault.getValueEquivalent(web3.eth.accounts[1]);

      assert.equal(eqValue.valueOf(), 198);
    });
  });

  it("sets the owner", async () => {
    const owner = await vault.getOwner.call();
    assert.equal(owner, web3.eth.accounts[0]);
  });
});
