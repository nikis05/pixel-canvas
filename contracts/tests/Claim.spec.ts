import { Blockchain, printTransactionFees, SandboxContract, SendMessageResult, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, AccountState, Builder, SendMode } from '@ton/core';
import { Claim, ClaimSuccess, storeClaimSuccess, loadClaim$Data, loadClaimSuccess } from '../build/Claim/Claim_Claim';
import '@ton/test-utils';
import { getTransactionFees } from './utils';
import { AccountStateActive } from '@ton/core/dist/types/AccountState';

describe('Claim', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let claim: SandboxContract<Claim>;
    let callbackRecipient: SandboxContract<TreasuryContract>;
    const successCallbackData = new Builder().storeInt(2, 3).endCell();

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        claim = blockchain.openContract(await Claim.fromInit(deployer.address, BigInt(0)));

        callbackRecipient = await blockchain.treasury('callbackRecipient');
    });

    it('deploys and sends a callback message', async () => {
        const deployResult = await claim.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ClaimMessage',
                id: BigInt(1),
                successCallbackAddress: callbackRecipient.address,
                successCallbackData,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: claim.address,
            deploy: true,
            success: true,
        });

        const claimSuccess = new Builder();
        storeClaimSuccess({
            $$type: 'ClaimSuccess',
            subject: BigInt(0),
            data: successCallbackData,
        })(claimSuccess);

        expect(deployResult.transactions).toHaveTransaction({
            from: claim.address,
            to: callbackRecipient.address,
            value: toNano('0.05') - getTransactionFees(deployResult.transactions[1]).total,
            inMessageBounceable: false,
            body: claimSuccess.endCell(),
        });

        const blockchainClaim = await blockchain.getContract(claim.address);
        expect(blockchainClaim.balance).toBe(toNano(0));
    });

    it('self-destructs if created by wrong sender', async () => {
        const wrongSender = await blockchain.treasury('wrongSender');
        const deployResult = await claim.send(
            wrongSender.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ClaimMessage',
                id: BigInt(1),
                successCallbackAddress: callbackRecipient.address,
                successCallbackData,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: wrongSender.address,
            to: claim.address,
            deploy: false,
            success: true,
        });

        expect(deployResult.transactions).toHaveTransaction({
            from: claim.address,
            to: wrongSender.address,
            body: Cell.EMPTY,
            mode: SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.DESTROY_ACCOUNT_IF_ZERO,
            inMessageBounceable: false,
            value: toNano('0.05') - getTransactionFees(deployResult.transactions[1]).total,
        });

        const blockchainClaim = await blockchain.getContract(claim.address);
        expect(blockchainClaim.accountState).toBe(undefined);

        const deployResult2 = await claim.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ClaimMessage',
                id: BigInt(1),
                successCallbackAddress: callbackRecipient.address,
                successCallbackData,
            },
        );

        expect(deployResult2.transactions).toHaveTransaction({
            from: deployer.address,
            to: claim.address,
            deploy: true,
            success: true,
        });

        const claimSuccess = new Builder();
        storeClaimSuccess({
            $$type: 'ClaimSuccess',
            subject: BigInt(0),
            data: successCallbackData,
        })(claimSuccess);

        expect(deployResult2.transactions).toHaveTransaction({
            from: claim.address,
            to: callbackRecipient.address,
            body: claimSuccess.endCell(),
        });
    });

    it('bounces when used for the second time', async () => {
        await claim.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ClaimMessage',
                id: BigInt(1),
                successCallbackAddress: callbackRecipient.address,
                successCallbackData,
            },
        );

        const sendResult = await claim.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'ClaimMessage',
                id: BigInt(1),
                successCallbackAddress: callbackRecipient.address,
                successCallbackData,
            },
        );

        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: claim.address,
            success: false,
            exitCode: 40300,
        });

        expect(sendResult.transactions).toHaveTransaction({
            from: claim.address,
            to: deployer.address,
            inMessageBounced: true,
        });

        const blockchainClaim = await blockchain.getContract(claim.address);
        expect(blockchainClaim.balance).toBe(toNano(0));
    });
});
