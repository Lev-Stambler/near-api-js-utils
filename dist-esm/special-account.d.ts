import { Account, KeyPair, Near } from "near-api-js";
import { SpecialAccountConnectedWallet, SpecialAccountWithKeyPair } from "./interfaces";
export declare const wrapAccountConnectedWallet: (near: Near) => SpecialAccountConnectedWallet;
export declare const wrapAccountKeyPair: (account: Account, keypair: KeyPair) => SpecialAccountWithKeyPair;
