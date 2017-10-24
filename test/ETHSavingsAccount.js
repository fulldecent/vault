const ETHSavingsAccount = artifacts.require("./ETHSavingsAccount.sol");
const utils = require('./utils');

const tokenTypes = {
  ETH: 0,
}

contract('ETHSavingsAccount', function(accounts) {
  var account;

  beforeEach(function() {
    return ETHSavingsAccount.new().then((instance) => {
      account = instance;
    });
  });

  it("should update the user's balance", async () => {
    await account.deposit({from: web3.eth.accounts[1], value: 100});
    const balance = await account.getBalance.call(web3.eth.accounts[1], tokenTypes.ETH);
    assert.equal(balance.valueOf(), 100);
  });

  it("should create debit and credit ledger entries", async () => {
    await account.deposit({from: web3.eth.accounts[1], value: 100});
    await utils.assertEvents(account, [
    {
      event: "LedgerEntry",
      args: {
        address_: web3.eth.accounts[1],
        debit: web3.toBigNumber('100')
      }
    },
    {
      event: "LedgerEntry",
      args: {
        address_: account.address,
        credit: web3.toBigNumber('100')
      }
    }
    ]);
  });

});
