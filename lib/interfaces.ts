import { Account, ConnectedWalletAccount, KeyPair } from "near-api-js";

export type AccountId = string;


/********** Special Accounts **************/
export enum SpecialAccountType {
  KeyPair = "KEY_PAIR",
  WebConnected = "WEB_CONNECTED",
}

interface SpecialAccountBase {
  type: SpecialAccountType;
}

export interface SpecialAccountWithKeyPair extends SpecialAccountBase, Account {
  type: SpecialAccountType.KeyPair;
  keypair: KeyPair;
}

export interface SpecialAccountConnectedWallet
  extends SpecialAccountBase,
    ConnectedWalletAccount {
  type: SpecialAccountType.WebConnected;
}

export type SpecialAccount =
  | SpecialAccountConnectedWallet
  | SpecialAccountWithKeyPair;


