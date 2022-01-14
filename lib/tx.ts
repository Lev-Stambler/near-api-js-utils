import { baseDecode, serialize } from "borsh";
import { sha256 } from "js-sha256";
import * as nearAPI from "near-api-js";
import {
  Action as NearAction,
  addKey,
  createTransaction as nearCreateTransaction,
  deleteKey,
  fullAccessKey,
  Transaction as NearTransaction,
  Transaction,
} from "near-api-js/lib/transaction";
import { KeyPair, PublicKey } from "near-api-js/lib/utils";
import { functionCall, SCHEMA } from "near-api-js/lib/transaction";

import { ConnectedWalletAccount } from "near-api-js";

import BN from "bn.js";
import { AccountId } from "./interfaces";
import {
  SpecialAccount,
  SpecialAccountConnectedWallet,
  SpecialAccountType,
  SpecialAccountWithKeyPair,
} from "./interfaces";

export interface ExecuteMultipleTxOpts<
  T extends SpecialAccountConnectedWallet | SpecialAccountWithKeyPair
> {
  callbackUrl?: T extends SpecialAccountConnectedWallet ? string : never;
}

export type TxHashesOrUndefined<SpecialAccountTypeGeneric> =
  SpecialAccountTypeGeneric extends SpecialAccountConnectedWallet
    ? undefined
    : string[];

export type TxHashOrUndefined<SpecialAccountTypeGeneric> =
  SpecialAccountTypeGeneric extends SpecialAccountConnectedWallet
    ? undefined
    : string;

export const MAX_GAS_STR = "300000000000000";
export const MAX_GAS = new BN(MAX_GAS_STR);

export const createTransactionKP = async (
  account: SpecialAccountWithKeyPair,
  receiverId: AccountId,
  actions: NearAction[],
  nonceOffset = 1
) =>
  createTransactionSeparateKP(account.keypair.getPublicKey())(
    account,
    receiverId,
    actions,
    nonceOffset
  );

const createTransactionSeparateKP =
  (publicKey: PublicKey) =>
  async (
    account: SpecialAccount,
    receiverId: AccountId,
    actions: NearAction[],
    nonceOffset = 1
  ) => {
    const accessKey = await account.connection.provider.query<any>(
      `access_key/${account.accountId}/${publicKey.toString()}`,
      ""
    );
    const nonce = accessKey.nonce + nonceOffset;
    const recentBlockHash = nearAPI.utils.serialize.base_decode(
      accessKey.block_hash
    );
    return nearAPI.transactions.createTransaction(
      account.accountId,
      publicKey,
      receiverId,
      nonce,
      actions,
      recentBlockHash
    );
  };

export const createTransactionWalletAccount = async (
  account: ConnectedWalletAccount,
  receiverId: AccountId,
  actions: NearAction[],
  nonceOffset = 1
): Promise<nearAPI.transactions.Transaction> => {
  const localKey = await account.connection.signer.getPublicKey(
    account.accountId,
    account.connection.networkId
  );
  let accessKey = await (
    account as ConnectedWalletAccount
  ).accessKeyForTransaction(receiverId, actions, localKey);
  if (!accessKey) {
    throw new Error(
      `Cannot find matching key for transaction sent to ${receiverId}`
    );
  }

  const block = await account.connection.provider.block({
    finality: "final",
  });
  const blockHash = baseDecode(block.header.hash);

  const publicKey = PublicKey.from(accessKey.public_key);
  const nonce = accessKey.access_key.nonce + nonceOffset;

  return nearCreateTransaction(
    account.accountId,
    publicKey,
    receiverId,
    nonce,
    actions,
    blockHash
  );
};

const signAndSendKPSpecified = async (
  txs: nearAPI.transactions.Transaction[],
  account: SpecialAccount,
  kp: KeyPair
) => {
  const lazyTxCalls = txs.map((tx) => {
    tx.publicKey = new PublicKey(kp.getPublicKey());
    const serializedTx = tx.encode();
    const serializedTxHash = new Uint8Array(sha256.array(serializedTx));

    const signature = kp.sign(serializedTxHash);
    const signedTransaction = new nearAPI.transactions.SignedTransaction({
      transaction: tx,
      signature: new nearAPI.transactions.Signature({
        keyType: tx.publicKey.keyType,
        data: signature.signature,
      }),
    });

    return async () => {
      const ret = await account.connection.provider.sendTransaction(
        signedTransaction
      );
      return ret.transaction.hash;
    };
  });

	// TODO: we probably can remove this sleep with a nonce offset?
  const sleepMS = 100;
  const txHashProms: Promise<string>[] = [];
  for (let i = 0; i < lazyTxCalls.length; i++) {
    await new Promise<void>((res, rej) => {
      setTimeout(() => {
        txHashProms.push(lazyTxCalls[i]());
        res();
      }, sleepMS);
    });
  }

  return await Promise.all(txHashProms);
};

export const signAndSendKP = async (
  txs: nearAPI.transactions.Transaction[],
  account: SpecialAccountWithKeyPair
): Promise<string[]> => {
  return signAndSendKPSpecified(txs, account, account.keypair);
};

// TODO: how can we have the tx hashes here... maybe something w/ callback url??
const signAndSendTxsWalletConnect = async (
  txs: NearTransaction[],
  account: SpecialAccountConnectedWallet,
  callbackUrl?: string
): Promise<void> => {
  account.walletConnection.requestSignTransactions({
    transactions: txs,
    callbackUrl,
  });
};

/**
 * Sign and send using the @param signAndSendTxsMethod
 */
const _executeMultipleTx = async <
  T extends SpecialAccountConnectedWallet | SpecialAccountWithKeyPair
>(
  signerAccount: T,
  transactions: Transaction[],
  signAndSendTxsMethod: (
    txs: NearTransaction[],
    account: SpecialAccount,
    callbackUrl?: string
  ) => Promise<TxHashesOrUndefined<T> | string[]>,
  createTransaction: typeof createTransactionKP,
  opts?: ExecuteMultipleTxOpts<T>
): Promise<TxHashesOrUndefined<T> | string[]> => {
  const nearTransactions = await Promise.all(
    transactions.map((t, i) => {
      return createTransaction(
        signerAccount as any,
        t.receiverId,
        t.actions,
        i + 1
      );
    })
  );
  return (await signAndSendTxsMethod(
    nearTransactions,
    signerAccount as any,
    opts?.callbackUrl || ""
  )) as TxHashesOrUndefined<T>;
};

/**
 * Execute multiple transactions irrespective of whether the account is a
 * keypair wallet or web wallet
 */
export const executeMultipleTx = async <
  T extends SpecialAccountConnectedWallet | SpecialAccountWithKeyPair
>(
  signerAccount: T,
  transactions: Transaction[],
  opts?: ExecuteMultipleTxOpts<T>
): Promise<TxHashesOrUndefined<T>> => {
  const signAndSendTxsMethod =
    signerAccount.type === SpecialAccountType.KeyPair
      ? signAndSendKP
      : signAndSendTxsWalletConnect;
  const createTransaction =
    signerAccount.type === SpecialAccountType.KeyPair
      ? createTransactionKP
      : createTransactionWalletAccount;
  return (await _executeMultipleTx<T>(
    signerAccount,
    transactions,
    //@ts-ignore
    signAndSendTxsMethod,
    createTransaction,
    opts
  )) as TxHashesOrUndefined<T>;
};
