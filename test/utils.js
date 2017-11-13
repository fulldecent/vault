var _ = require("lodash");
var Promise = require("bluebird");
var BigNumber = require('bignumber.js');
var one = new BigNumber(1);

async function createAndApproveEth(ledger, etherToken, amount, account, approvalAmount) {
  await etherToken.deposit({from: account, value: amount});
  await etherToken.approve(ledger.address, approvalAmount || amount, {from: account});
};

module.exports = {
  // https://ethereum.stackexchange.com/a/21661
  //
  assertEvents: function(contract, expectedEvents) {
    return new Promise((resolve, reject) => {
      var event = contract.allEvents();
      event.get((error, events) => {
        _.each(expectedEvents, (expectedEvent) => {
          if (!_.find(events, expectedEvent)) {
            throw new Error(expectedEvent.event + "(" + JSON.stringify(expectedEvent.args) + ") wasn't logged");
          }
        })
        resolve();
      });
      event.stopWatching();
    });
  },

  assertDifference: async function(assert, difference, checkFn, execFn) {
    const start = await checkFn();

    await execFn();

    const end = await checkFn();

    return assert.equal(end.minus(start), difference);
  },

  createAndApproveEth: createAndApproveEth,

  depositEth: async function(ledger, etherToken, amount, account) {
    await createAndApproveEth(ledger, etherToken, amount, account);
    await ledger.deposit(etherToken.address, amount, account);
  },

  ledgerAccountBalance: async function(ledger, account, token) {
    return (await ledger.getAccountBalanceRaw.call(account, token)).valueOf();
  },

  tokenBalance: async function(token, account) {
    return (await token.balanceOf(account)).valueOf();
  },

  ethBalance: async function(account) {
    return web3.toBigNumber((await web3.eth.getBalance(account)).valueOf());
  },

// http://www.thecalculatorsite.com/articles/finance/compound-interest-formula.php
// A = P (1 + r/n) ^ (nt)
//
// Where:
//
// A = the future value of the investment/loan, including interest
// P = the principal investment amount (the initial deposit or loan amount)
// r = the annual interest rate (decimal)
// n = the number of times that interest is compounded per year
// t = the number of years the money is invested or borrowed for

  compoundedInterest: (
    {
      principal,
      interestRate,
      payoutsPerTimePeriod,
      duration,
    }
  ) =>
    principal.times(
      one.plus(interestRate.dividedBy(payoutsPerTimePeriod)).
        toPower(payoutsPerTimePeriod.times(duration)
      )
    )
}
