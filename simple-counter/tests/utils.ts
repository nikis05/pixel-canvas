import { Cell, Transaction } from '@ton/core';
import { SmartContract } from '@ton/sandbox';
import assert from 'node:assert';

export function getTransactionFees(transaction: Transaction): TransactionFees {
    const description = transaction.description;
    assert(description.type == 'generic');
    assert(description.computePhase.type == 'vm');
    const compute = description.computePhase.gasFees;
    const forwardIn =
        transaction.inMessage?.info.type === 'internal' ? transaction.inMessage.info.forwardFee : BigInt(0);
    const forwardOut = description.actionPhase?.totalFwdFees ?? BigInt(0);
    const total = compute + forwardOut;
    return { compute, forwardIn, forwardOut, total };
}

export type TransactionFees = { compute: bigint; forwardIn: bigint; forwardOut: bigint; total: bigint };

export function getTransactionValue(transaction: Transaction): bigint {
    const info = transaction.inMessage?.info;
    assert(info?.type == 'internal');
    return info.value.coins;
}

export function getContractState(contract: SmartContract): Cell {
    const accountState = contract.accountState;
    assert(accountState?.type == 'active');
    const data = accountState.state.data;
    assert(data);
    return data;
}
