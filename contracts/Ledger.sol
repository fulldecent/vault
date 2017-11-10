pragma solidity ^0.4.4;

contract Ledger {
    enum LedgerAssetType { ETH }

    struct Balance {
        uint256 amount;
        uint256 timestamp;
    }

    uint64 savingsInterestRate;
    uint64 payoutsPerYear;

    mapping(address => mapping(address => Balance)) balances;

    event LedgerEntry(address address_, uint debit, uint credit);

    /**
      * @notice `Ledger` tracks balances for a given account by asset with interest
      * @param savingsInterestRate_ The interest rate
      * @param payoutsPerYear_ The number of payouts to make
      */
    function Ledger(uint64 savingsInterestRate_, uint64 payoutsPerYear_) public {
        savingsInterestRate = savingsInterestRate_;
        payoutsPerYear = payoutsPerYear_;
    }

	/**
      * @notice `getAccountBalanceRaw` returns the balance (without interest) for
      * the given acct in the given asset (e.g. Weth or OMG)
      * @param acct The account to get the balance of
      * @param asset The address of the asset
      * @return balance The balance (without interest) of the asset in given acct
      */
    function getAccountBalanceRaw(address acct, address asset) public view returns (uint256) {
        return balances[acct][asset].amount;
    }

    /**
      * @notice `getBalanceWithInterest` returns the balance (with interest) for
      * the given acct in the given asset (e.g. Weth or OMG)
      * @param acct The account to get the balance of
      * @param asset The asset to check the balance of
      * @param timestamp The timestamp at which to check the value.
      */
    function getBalanceWithInterest(address acct, address asset, uint256 timestamp) public view returns (uint256) {
        Balance memory balance = balances[acct][address(asset)];

        uint256 principal = balance.amount;
        uint256 lastEntryTimestamp = balance.timestamp;
        uint256 duration = (timestamp - lastEntryTimestamp) / (1 years);
        uint256 payouts = duration * payoutsPerYear;
        uint256 amortization = principal;

        for (uint64 _i = 0; _i < payouts; _i++) {
            amortization = amortization + ((amortization * savingsInterestRate) / 100 / payoutsPerYear);
        }

        return amortization;
    }

    /**
      * @notice `deposit` deposits a given asset in the bank vault.
      */
    function deposit() public payable {
        address depositor = msg.sender;
        uint256 value = msg.value;

        LedgerEntry(depositor, value, 0);
        LedgerEntry(address(this), 0, value);

        // TODO: Verify this updates the given balance.
        Balance storage balance = balances[depositor][address(LedgerAssetType.ETH)];

        balance.amount += value;
        balance.timestamp = now;
    }
}