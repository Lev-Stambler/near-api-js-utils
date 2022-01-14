var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { baseDecode } from "borsh";
import { sha256 } from "js-sha256";
import * as nearAPI from "near-api-js";
import { createTransaction as nearCreateTransaction, } from "near-api-js/lib/transaction";
import { PublicKey } from "near-api-js/lib/utils";
import BN from "bn.js";
import { SpecialAccountType, } from "./interfaces";
export const MAX_GAS_STR = "300000000000000";
export const MAX_GAS = new BN(MAX_GAS_STR);
export const createTransactionKP = (account, receiverId, actions, nonceOffset = 1) => __awaiter(void 0, void 0, void 0, function* () {
    return createTransactionSeparateKP(account.keypair.getPublicKey())(account, receiverId, actions, nonceOffset);
});
const createTransactionSeparateKP = (publicKey) => (account, receiverId, actions, nonceOffset = 1) => __awaiter(void 0, void 0, void 0, function* () {
    const accessKey = yield account.connection.provider.query(`access_key/${account.accountId}/${publicKey.toString()}`, "");
    const nonce = accessKey.nonce + nonceOffset;
    const recentBlockHash = nearAPI.utils.serialize.base_decode(accessKey.block_hash);
    return nearAPI.transactions.createTransaction(account.accountId, publicKey, receiverId, nonce, actions, recentBlockHash);
});
export const createTransactionWalletAccount = (account, receiverId, actions, nonceOffset = 1) => __awaiter(void 0, void 0, void 0, function* () {
    const localKey = yield account.connection.signer.getPublicKey(account.accountId, account.connection.networkId);
    let accessKey = yield account.accessKeyForTransaction(receiverId, actions, localKey);
    if (!accessKey) {
        throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
    }
    const block = yield account.connection.provider.block({
        finality: "final",
    });
    const blockHash = baseDecode(block.header.hash);
    const publicKey = PublicKey.from(accessKey.public_key);
    const nonce = accessKey.access_key.nonce + nonceOffset;
    return nearCreateTransaction(account.accountId, publicKey, receiverId, nonce, actions, blockHash);
});
const signAndSendKPSpecified = (txs, account, kp) => __awaiter(void 0, void 0, void 0, function* () {
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
        return () => __awaiter(void 0, void 0, void 0, function* () {
            const ret = yield account.connection.provider.sendTransaction(signedTransaction);
            return ret.transaction.hash;
        });
    });
    // TODO: we probably can remove this sleep with a nonce offset?
    const sleepMS = 100;
    const txHashProms = [];
    for (let i = 0; i < lazyTxCalls.length; i++) {
        yield new Promise((res, rej) => {
            setTimeout(() => {
                txHashProms.push(lazyTxCalls[i]());
                res();
            }, sleepMS);
        });
    }
    return yield Promise.all(txHashProms);
});
export const signAndSendKP = (txs, account) => __awaiter(void 0, void 0, void 0, function* () {
    return signAndSendKPSpecified(txs, account, account.keypair);
});
// TODO: how can we have the tx hashes here... maybe something w/ callback url??
const signAndSendTxsWalletConnect = (txs, account, callbackUrl) => __awaiter(void 0, void 0, void 0, function* () {
    account.walletConnection.requestSignTransactions({
        transactions: txs,
        callbackUrl,
    });
});
/**
 * Sign and send using the @param signAndSendTxsMethod
 */
const _executeMultipleTx = (signerAccount, transactions, signAndSendTxsMethod, createTransaction, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const nearTransactions = yield Promise.all(transactions.map((t, i) => {
        return createTransaction(signerAccount, t.receiverId, t.actions, i + 1);
    }));
    return (yield signAndSendTxsMethod(nearTransactions, signerAccount, (opts === null || opts === void 0 ? void 0 : opts.callbackUrl) || ""));
});
/**
 * Execute multiple transactions irrespective of whether the account is a
 * keypair wallet or web wallet
 */
export const executeMultipleTx = (signerAccount, transactions, opts) => __awaiter(void 0, void 0, void 0, function* () {
    const signAndSendTxsMethod = signerAccount.type === SpecialAccountType.KeyPair
        ? signAndSendKP
        : signAndSendTxsWalletConnect;
    const createTransaction = signerAccount.type === SpecialAccountType.KeyPair
        ? createTransactionKP
        : createTransactionWalletAccount;
    return (yield _executeMultipleTx(signerAccount, transactions, 
    //@ts-ignore
    signAndSendTxsMethod, createTransaction, opts));
});
