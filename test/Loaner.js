"use strict";

contract('Loaner', function(accounts) {
  // Most loaner functions require having a proper
  // savings set-up, so we leave the tests in `Vault.js`,
  // which has both set.
  //
  // In the future, we may decide to create a mock for `Savings`,
  // in which case we could properly unit-test `Loaner`.
  //
  // For now, see `test/Vault.js`
});
