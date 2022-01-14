import * as nearAPI from "near-api-js";
import { Action as NearAction, Transaction } from "near-api-js/lib/transaction";
import { ConnectedWalletAccount } from "near-api-js";
import BN from "bn.js";
import { AccountId } from "./interfaces";
import { SpecialAccountConnectedWallet, SpecialAccountWithKeyPair } from "./interfaces";
export interface ExecuteMultipleTxOpts<T extends SpecialAccountConnectedWallet | SpecialAccountWithKeyPair> {
    callbackUrl?: T extends SpecialAccountConnectedWallet ? string : never;
}
export declare type TxHashesOrUndefined<SpecialAccountTypeGeneric> = SpecialAccountTypeGeneric extends SpecialAccountConnectedWallet ? undefined : string[];
export declare type TxHashOrUndefined<SpecialAccountTypeGeneric> = SpecialAccountTypeGeneric extends SpecialAccountConnectedWallet ? undefined : string;
export declare const MAX_GAS_STR = "300000000000000";
export declare const MAX_GAS: BN;
export declare const createTransactionKP: (account: SpecialAccountWithKeyPair, receiverId: AccountId, actions: NearAction[], nonceOffset?: number) => Promise<nearAPI.transactions.Transaction>;
export declare const createTransactionWalletAccount: (account: ConnectedWalletAccount, receiverId: AccountId, actions: NearAction[], nonceOffset?: number) => Promise<nearAPI.transactions.Transaction>;
export declare const signAndSendKP: (txs: nearAPI.transactions.Transaction[], account: SpecialAccountWithKeyPair) => Promise<string[]>;
/**
 * Execute multiple transactions irrespective of whether the account is a
 * keypair wallet or web wallet
 */
export declare const executeMultipleTx: <T extends SpecialAccountWithKeyPair | SpecialAccountConnectedWallet>(signerAccount: T, transactions: Transaction[], opts?: ExecuteMultipleTxOpts<T> | undefined) => Promise<TxHashesOrUndefined<T>>;
