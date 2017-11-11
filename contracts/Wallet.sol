pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./Bank.sol";
import "./tokens/EtherToken.sol";

/**
  * @title The Compound Smart Wallet
  * @author Compound
  * @notice The Compound Smart Wallet allows customers to easily access
  * the Compound core contracts.
  */
contract Wallet is Owned {
    Bank bank;
    EtherToken etherToken;

    event Deposit(address acct, address asset, uint256 amount);
    event Withdrawal(address acct, address asset, uint256 amount);

    /**
      * @notice Creates a new Wallet.
      * @param bankAddress Address of Compound Bank contract
      * @param etherTokenAddress Address of EtherToken contract
      */
    function Wallet(address owner_, address bankAddress, address etherTokenAddress) public {
        owner = owner_;
        bank = Bank(bankAddress);
        etherToken = EtherToken(etherTokenAddress);
    }

    /**
      * @notice Deposits eth into the Compound Bank contract
      */
    function depositEth() public payable {
        // Transfer eth into EtherToken
        etherToken.deposit.value(msg.value)();

        depositInteral(address(etherToken), msg.value);
    }

    /**
      * @notice Deposits token into Compound Bank contract
      * @param asset Address of token
      * @param amount Amount of token to transfer
      */
    function depositAsset(address asset, uint256 amount) public {
        // First, transfer in to this wallet
        if (!Token(asset).transferFrom(msg.sender, address(this), amount)) {
            revert();
        }

        depositInteral(asset, amount);
    }

    function depositInteral(address asset, uint256 amount) private {
        // Approve the bank to pull in this asset
        Token(asset).approve(address(bank), amount);

        // Deposit asset in Compound Bank contract
        bank.deposit(asset, address(this), amount);

        // Log this deposit
        Deposit(msg.sender, asset, amount);
    }

    /**
      * @notice Withdraws eth from Compound Bank contract
      * @param amount Amount to withdraw
      * @param to Address to withdraw to
      */
    function withdrawEth(uint256 amount, address to) public onlyOwner {
        // Withdraw from Compound Bank contract to EtherToken
        bank.withdraw(address(etherToken), address(this), amount);

        // Now we have EtherTokens, let's withdraw them to Eth
        etherToken.withdraw(amount);

        // Now, we should have the ether from the withdraw,
        // let's send that to the `to` address
        to.transfer(amount);

        // Log event
        Withdrawal(msg.sender, address(etherToken), amount);
    }

    /**
      * @notice Withdraws asset from Compound Bank contract
      * @param asset Asset to withdraw
      * @param amount Amount to withdraw
      * @param to Address to withdraw to
      */
    function withdrawAsset(address asset, uint256 amount, address to) public onlyOwner {
        // Withdraw the asset
        bank.withdraw(asset, to, amount);

        // Log event
        Withdrawal(msg.sender, asset, amount);
    }

    /**
      * @notice Deposit Eth into Compound Bank contract.
      * @dev We allow arbitrary deposits in from `etherToken`
      */
    function() public payable {
        if (msg.sender == address(etherToken)) {
            // Don't do anything if coming from EtherToken unwrap
            return;
        } else {
            depositEth();
        }
    }
}