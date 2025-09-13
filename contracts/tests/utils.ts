import { Builder, Cell, Transaction } from '@ton/core';
import { sha256 } from '@ton/crypto';
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

export async function hashToInt(data: string): Promise<bigint> {
    return BigInt('0x' + (await sha256(data)).toString('hex'));
}

export function makeDna({
    fillWithOnes = false,
    nonFullLevel0Cell = false,
    missingLevel1Cell = false,
    nonFullLevel1Cell = false,
    missingLevel2Cell = false,
    nonFullLevel2Cell = false,
    missingLevel3Cell = false,
    extraneousLevel3CellLeftmostBranch = false,
    extraneousLevel3CellOtherBranch = false,
    nonFullLevel3Cell = false,
    incorrectSizeLevel3CellRightmost = false,
    extraneousLevel4Cell = false,
    extraneousLevel4CellRightmostLevel3Cell = false,
}: {
    fillWithOnes?: boolean;
    nonFullLevel0Cell?: boolean;
    missingLevel1Cell?: boolean;
    nonFullLevel1Cell?: boolean;
    missingLevel2Cell?: boolean;
    nonFullLevel2Cell?: boolean;
    missingLevel3Cell?: boolean;
    extraneousLevel3CellLeftmostBranch?: boolean;
    extraneousLevel3CellOtherBranch?: boolean;
    nonFullLevel3Cell?: boolean;
    incorrectSizeLevel3CellRightmost?: boolean;
    extraneousLevel4Cell?: boolean;
    extraneousLevel4CellRightmostLevel3Cell?: boolean;
} = {}): Cell {
    const fillWith = fillWithOnes ? BigInt('0b' + '1'.repeat(1023)) : 0;

    const level3 = new Builder().storeUint(fillWith, nonFullLevel3Cell ? 1022 : 1023);

    if (extraneousLevel4Cell) {
        level3.storeRef(new Builder().storeBit(true));
    }

    const level3Rightmost = new Builder().storeUint(0, incorrectSizeLevel3CellRightmost ? 25 : 24);

    if (extraneousLevel4CellRightmostLevel3Cell) {
        level3Rightmost.storeRef(new Builder().storeBit(true));
    }

    const level2Leftmost = new Builder().storeUint(fillWith, 1023).storeRef(level3).storeRef(level3);

    if (!missingLevel3Cell) {
        level2Leftmost.storeRef(level3Rightmost);
    }

    if (extraneousLevel3CellLeftmostBranch) {
        level2Leftmost.storeRef(level3);
    }

    const level2 = new Builder().storeUint(fillWith, nonFullLevel2Cell ? 1022 : 1023);

    if (extraneousLevel3CellOtherBranch) {
        level2.storeRef(level3);
    }

    const level1Leftmost = new Builder()
        .storeUint(fillWith, 1023)
        .storeRef(level2Leftmost)
        .storeRef(level2)
        .storeRef(level2)
        .storeRef(level2);

    const level1 = new Builder()
        .storeUint(fillWith, nonFullLevel1Cell ? 1022 : 1023)
        .storeRef(level2)
        .storeRef(level2)
        .storeRef(level2);

    if (!missingLevel2Cell) {
        level1.storeRef(level2);
    }

    const level0 = new Builder()
        .storeUint(fillWith, nonFullLevel0Cell ? 1022 : 1023)
        .storeRef(level1Leftmost)
        .storeRef(level1)
        .storeRef(level1);

    if (!missingLevel1Cell) {
        level0.storeRef(level1);
    }

    return level0.endCell();
}
