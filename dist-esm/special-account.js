import { Account, ConnectedWalletAccount, Near, WalletConnection, } from "near-api-js";
import { SpecialAccountType, } from "./interfaces";
export const wrapAccountConnectedWallet = (near) => {
    const newNear = new Near(near.config);
    const walletConnection = new WalletConnection(newNear, null);
    const account = new ConnectedWalletAccount(walletConnection, walletConnection.account().connection, walletConnection.account().accountId);
    account.type = SpecialAccountType.WebConnected;
    //@ts-ignore
    return account;
};
export const wrapAccountKeyPair = (account, keypair) => {
    const newAccountKP = new Account(account.connection, account.accountId);
    newAccountKP.type = SpecialAccountType.KeyPair;
    newAccountKP.keypair = keypair;
    // @ts-ignore
    return newAccountKP;
};
