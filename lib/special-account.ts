import {
  Account,
  ConnectedWalletAccount,
  KeyPair,
  Near,
  WalletConnection,
} from "near-api-js";
import {
  SpecialAccountConnectedWallet,
  SpecialAccountType,
  SpecialAccountWithKeyPair,
} from "./interfaces";

export const wrapAccountConnectedWallet = (
  near: Near
): SpecialAccountConnectedWallet => {
  const newNear = new Near(near.config);
  const walletConnection = new WalletConnection(newNear, null);
  const account = new ConnectedWalletAccount(
    walletConnection,
    walletConnection.account().connection,
    walletConnection.account().accountId
  );

  (account as any).type = SpecialAccountType.WebConnected;
  //@ts-ignore
  return account;
};

export const wrapAccountKeyPair = (
  account: Account,
  keypair: KeyPair
): SpecialAccountWithKeyPair => {
  const newAccountKP = new Account(account.connection, account.accountId);
  (newAccountKP as any).type = SpecialAccountType.KeyPair;
  (newAccountKP as any).keypair = keypair;
  // @ts-ignore
  return newAccountKP as SpecialAccountWithKeyPair;
};
