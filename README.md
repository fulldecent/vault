The Compound Vault ([RFC
001](https://docs.google.com/document/d/1qZSVKbHnCVKOw11gDUQxZm8TEEahtN_XluvapkcWARY/edit))
==============

The Compound Vault contract is where Compound stores customer deposits. These
contracts should be as simple as possible to avoid bugs and vulnerabilities.

Initially we will have a limited number of account types defined. Once we can
ensure these contracts are well tested an secure we plan to make an abstract
account
contract that will be non-upgradable. This contract will be able to represent
all future account types. Currently we plan to build that abstraction with using
a Finite State Machine Runner ([RFC
004](https://docs.google.com/document/d/1iqse_gcZ_qYwPmqFcm7Wsj4bMGiXVKnYroGcs2unDCQ/edit)).

Installation
------------
To install the Compound Vault first pull the repository from GitHub and then
install its dependencies:

    git clone https://github.com/compound-finance/vault
    cd vault
    yarn
    truffle compile
    truffle migrate

Testing
-------
Contract tests are defined under the [test
directory](https://github.com/compound-finance/vault/tree/master/test). To run the tests run:

    truffle test

Deployment
----------
To deploy the Vault contracts run:


    truffle deploy

_© Copyright 2017 Compound_
