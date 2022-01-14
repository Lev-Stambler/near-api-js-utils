import { Account, ConnectedWalletAccount, KeyPair } from "near-api-js";
export declare type AccountId = string;
/********** Special Accounts **************/
export declare enum SpecialAccountType {
    KeyPair = "KEY_PAIR",
    WebConnected = "WEB_CONNECTED"
}
interface SpecialAccountBase {
    type: SpecialAccountType;
}
export interface SpecialAccountWithKeyPair extends SpecialAccountBase, Account {
    type: SpecialAccountType.KeyPair;
    keypair: KeyPair;
}
export interface SpecialAccountConnectedWallet extends SpecialAccountBase, ConnectedWalletAccount {
    type: SpecialAccountType.WebConnected;
}
export declare type SpecialAccount = SpecialAccountConnectedWallet | SpecialAccountWithKeyPair;
export {};
