pragma solidity ^0.4.18;

import "./base/Owned.sol";
import "./Wallet.sol";

/**
  * @title The Compound Smart Wallet Factory
  * @author Compound
  * @notice Helps Compound users create a Compound Smart Wallet
  * 		after registration.
  */
contract WalletFactory is Owned {
    /*
     * Note: These state variables are immuatable.
     * We must create a new factory to change either address.
     */
    address vaultAddress;
    address etherTokenAddress;

    event NewWallet(address walletOwner, address newWalletAddress, address walletFactoryAddress);

    /**
      * @notice Creates a new Wallet Factory.
      * @param vaultAddress_ Address of Compound Vault contract
      * @param etherTokenAddress_ Address of Compound EtherToken contract
      */
    function WalletFactory(address vaultAddress_, address etherTokenAddress_) public {
        vaultAddress = vaultAddress_;
        etherTokenAddress = etherTokenAddress_;
    }

    /**
      * @notice Creates a new Compound Smart Wallet with given owner
      * @return wallet The new wallet which was created
      * !!SECURITY!! Add back `ownerOnly` check
      */
    function newWallet(address walletOwner) public returns (Wallet) {
        Wallet wallet = new Wallet(walletOwner, vaultAddress, etherTokenAddress);

        NewWallet(walletOwner, address(wallet), address(this));

        return wallet;
    }

}
