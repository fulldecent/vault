var _ = require("lodash");
var Promise = require("bluebird");

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
  }
}
