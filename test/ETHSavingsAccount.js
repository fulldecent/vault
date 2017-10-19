const ETHSavingsAccount = artifacts.require("./ETHSavingsAccount.sol");
const utils = require('./utils');


contract('ETHSavingsAccount', function(accounts) {
  it("should create debit and credit ledger entries", async () => {
    let account = await ETHSavingsAccount.deployed();
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
