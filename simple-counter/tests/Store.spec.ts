import { Blockchain, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Builder, Cell, toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';
import '@ton/test-utils';
import { Collection } from '../build/Collection/Collection_Collection';
import { getTransactionFees, getTransactionValue, makeDna } from './utils';
import {
    ItemSpec,
    loadMint,
    storeFailedMinting,
    storeMintForwardPayload,
    storeOwnershipAssigned,
    storeSuccessfulMinting,
    storeTransfer,
    storeTransferOwnership,
} from '../build/Collection/Collection_Claim';
import { Item } from '../build/Collection/Collection_Item';
import { send } from 'process';

describe('Store', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<Collection>;
    let store: SandboxContract<Store>;
    let buyer: SandboxContract<TreasuryContract>;
    const itemSpec: ItemSpec = { $$type: 'ItemSpec', title: 'title', artist: 'artist', dna: makeDna() };

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        buyer = await blockchain.treasury('buyer');

        collection = blockchain.openContract(
            await Collection.fromInit(BigInt(2), 'https://example.com', 'description', Cell.EMPTY),
        );
        store = blockchain.openContract(await Store.fromInit(collection.address));

        await collection.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            null,
        );

        await collection.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'SetMinter',
                minterAddress: store.address,
            },
        );
    });

    describe('empty reciever', () => {
        it('deploys', async () => {
            const deployResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                deploy: true,
                success: true,
            });

            const fees = getTransactionFees(deployResult.transactions[1]);

            expect(deployResult.transactions).toHaveTransaction({
                from: store.address,
                to: deployer.address,
                value: toNano('0.4') - fees.forwardOut,
            });

            const blockchainStore = await blockchain.getContract(store.address);
            expect(blockchainStore.balance).toBe(toNano('0.1') - fees.compute);
        });

        it('when already deployed, tops up balance', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const blockchainStore = await blockchain.getContract(store.address);
            const balanceBeforeMsg = blockchainStore.balance;

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                null,
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                deploy: false,
                success: true,
            });

            const fees = getTransactionFees(sendResult.transactions[1]);
            const blockchainStore2 = await blockchain.getContract(store.address);
            const balanceAfterMsg = blockchainStore2.balance;
            expect(balanceAfterMsg).toBe(balanceBeforeMsg + toNano('0.2') - fees.compute);
        });
    });

    describe('Bake', () => {
        it('mints the token for the sender', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            const item = blockchain.openContract(await Item.fromInit(collection.address, BigInt(0)));
            expect((await item.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(buyer.address);

            const id = loadMint(sendResult.transactions[2].inMessage!.body.asSlice()).id;

            const successfulMinting = new Builder();
            storeSuccessfulMinting({
                $$type: 'SuccessfulMinting',
                id,
            })(successfulMinting);

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: successfulMinting.endCell(),
                success: true,
            });
        });

        it('works correctly with multiple tokens', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult1 = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult1.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            const item1 = blockchain.openContract(await Item.fromInit(collection.address, BigInt(0)));
            expect((await item1.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(buyer.address);

            const id1 = loadMint(sendResult1.transactions[2].inMessage!.body.asSlice()).id;

            const successfulMinting1 = new Builder();
            storeSuccessfulMinting({
                $$type: 'SuccessfulMinting',
                id: id1,
            })(successfulMinting1);

            expect(sendResult1.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: successfulMinting1.endCell(),
                success: true,
            });

            const sendResult2 = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult2.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            const id = loadMint(sendResult2.transactions[2].inMessage!.body.asSlice()).id;

            const failedMinting = new Builder();
            storeFailedMinting({
                $$type: 'FailedMinting',
                id,
            })(failedMinting);

            expect(sendResult2.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: failedMinting.endCell(),
                success: true,
            });

            expect(sendResult2.transactions).toHaveTransaction({
                from: store.address,
                to: buyer.address,
                mode: 64,
                op: 0x435e0ccd,
            });

            const sendResult3 = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: { ...itemSpec, dna: makeDna({ fillWithOnes: true }) },
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult1.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            const item3 = blockchain.openContract(await Item.fromInit(collection.address, BigInt(1)));
            expect((await item3.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(buyer.address);

            const id3 = loadMint(sendResult3.transactions[2].inMessage!.body.asSlice()).id;

            const successfulMinting3 = new Builder();
            storeSuccessfulMinting({
                $$type: 'SuccessfulMinting',
                id: id3,
            })(successfulMinting3);

            expect(sendResult3.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: successfulMinting3.endCell(),
                success: true,
            });
        });

        it('when giftTo is specified, mints the token as a gift', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: buyer.address,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                op: 0xf0f7c18a,
                success: true,
            });

            const item = blockchain.openContract(await Item.fromInit(collection.address, BigInt(0)));
            expect((await item.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(buyer.address);

            const id = loadMint(sendResult.transactions[2].inMessage!.body.asSlice()).id;

            const successfulMinting = new Builder();
            storeSuccessfulMinting({
                $$type: 'SuccessfulMinting',
                id,
            })(successfulMinting);

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: successfulMinting.endCell(),
            });
        });

        it('when offerExclusive is specified, mints an exclusive and adds it to forwarded exclusives', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('1'),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                op: 0xf0f7c18a,
                success: true,
            });

            const item = blockchain.openContract(await Item.fromInit(collection.address, BigInt(0)));
            expect((await item.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(store.address);

            expect(sendResult.transactions).toHaveTransaction({
                from: item.address,
                to: store.address,
                op: 0x05138d91,
            });

            const id = loadMint(sendResult.transactions[2].inMessage!.body.asSlice()).id;

            const successfulMinting = new Builder();
            storeSuccessfulMinting({
                $$type: 'SuccessfulMinting',
                id,
            })(successfulMinting);

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: successfulMinting.endCell(),
            });

            const exclusivesOffered = await store.getExclusivesOffered();
            expect(exclusivesOffered.size).toBe(1);
            expect(exclusivesOffered.get(0)).toBe(toNano('1'));
        });

        it('when a claim fails, refunds the sender', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            const id = loadMint(sendResult.transactions[2].inMessage!.body.asSlice()).id;

            const failedMinting = new Builder();
            storeFailedMinting({
                $$type: 'FailedMinting',
                id,
            })(failedMinting);

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                body: failedMinting.endCell(),
                success: true,
            });

            expect(sendResult.transactions).toHaveTransaction({
                from: store.address,
                to: buyer.address,
                mode: 64,
                op: 0x435e0ccd,
            });
        });

        it('when collection.mint throws, refunds the sender', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: { ...itemSpec, title: 'Lorem ipsum dolor sit amet, conse' },
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: store.address,
                inMessageBounced: true,
                success: true,
            });

            expect(sendResult.transactions).toHaveTransaction({
                from: store.address,
                to: buyer.address,
                mode: 64,
                op: 0x435e0ccd,
            });
        });

        it('throws if the shop is closed', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetClosed',
                    closed: true,
                },
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 55491,
            });
        });

        it('thows if both giftTo and offerExclusive are set', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: buyer.address,
                    offerExclusive: toNano(1),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                success: false,
                exitCode: 6226,
            });
        });

        it('throws if giftTo is set and sender is not the owner', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: buyer.address,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });

        it('thows if offerExclusive is set and sender is not the owner', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('1'),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });

        it('thows if offerExclusive price is too low', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('0.1'),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                success: false,
                exitCode: 47395,
            });
        });

        it('throws if message value is not 4.99', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.98'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 53804,
            });
        });

        it('throws if giftTo is set and message value is not 0.5', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.4'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: buyer.address,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                success: false,
                exitCode: 53804,
            });
        });

        it('thows if offerExclusive is set and message value is not 0.5', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('1'),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                success: false,
                exitCode: 53804,
            });
        });
    });

    describe('SuccessfulMinting', () => {
        it('throws if sender is not collection', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SuccessfulMinting',
                    id: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 61739,
            });
        });
    });

    describe('FailedMinting', () => {
        it('throws if sender is not collection', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'FailedMinting',
                    id: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 61739,
            });
        });
    });

    describe('OwnershipAssigned', () => {
        it('throws if sender is not item', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const mintForwardPayload = new Builder();
            storeMintForwardPayload({
                $$type: 'MintForwardPayload',
                itemIndex: BigInt(0),
                custom: Cell.EMPTY,
            })(mintForwardPayload);

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'OwnershipAssigned',
                    queryId: BigInt(0),
                    prevOwner: wrongSender.address,
                    forwardPayload: mintForwardPayload.asSlice(),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 61739,
            });
        });
    });

    describe('PurchaseExclusive', () => {
        it('sends an exclusive item to the buyer', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const bakeResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('1'),
                },
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('1'),
                },
                {
                    $$type: 'PurchaseExclusive',
                    itemIndex: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });

            const item = blockchain.openContract(await Item.fromInit(collection.address, BigInt(0)));
            expect((await item.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(buyer.address);

            expect((await store.getExclusivesOffered()).size).toBe(0);
        });

        it('throws if requested item is not offered', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('1'),
                },
                {
                    $$type: 'PurchaseExclusive',
                    itemIndex: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 32863,
            });
        });

        it('throws if message value does not equal item price', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('1'),
                },
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('0.9'),
                },
                {
                    $$type: 'PurchaseExclusive',
                    itemIndex: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 53804,
            });
        });
    });

    describe('RemoveExclusive', () => {
        it('removes exclusive and sends it to owner', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: toNano('1'),
                },
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'RemoveExclusive',
                    itemIndex: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                op: 0xed0dde35,
                success: true,
            });

            const item = blockchain.openContract(await Item.fromInit(collection.address, BigInt(0)));
            expect((await item.getGetNftData()).ownerAddress.loadAddress()).toEqualAddress(deployer.address);

            expect((await store.getExclusivesOffered()).size).toBe(0);
        });

        it('throws if sender is not owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'RemoveExclusive',
                    itemIndex: BigInt(0),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('Withdraw', () => {
        it('sends remaining balance to owner, minus reserves', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.1'),
                },
                {
                    $$type: 'Withdraw',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: store.address,
                to: deployer.address,
            });
        });

        it('throws if sender is not the owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Withdraw',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('SetClosed', () => {
        it('closes the contract', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetClosed',
                    closed: true,
                },
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: false,
                exitCode: 55491,
            });
        });

        it('opens the contract', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetClosed',
                    closed: true,
                },
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetClosed',
                    closed: false,
                },
            );

            const sendResult = await store.send(
                buyer.getSender(),
                {
                    value: toNano('4.99'),
                },
                {
                    $$type: 'Bake',
                    spec: itemSpec,
                    giftTo: null,
                    offerExclusive: null,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: store.address,
                success: true,
            });
        });

        it('throws if sender is not the owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetClosed',
                    closed: true,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('Terminate', () => {
        it('sends remaining balance to owner and self destructs the contract', async () => {
            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetClosed',
                    closed: true,
                },
            );

            const sendResult = await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Terminate',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: store.address,
                success: true,
            });

            expect(sendResult.transactions).toHaveTransaction({
                from: store.address,
                to: deployer.address,
                mode: 160,
            });
        });

        it('throws if sender is not the owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Terminate',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('TransferOwnership', () => {
        it('throws when called by non-owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            const newOwner = await blockchain.treasury('newOwner');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: store.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('AcceptOwnership', () => {
        it('changes owner', async () => {
            const newOwner = await blockchain.treasury('newOwner');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            const sendResult = await store.send(
                newOwner.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'AcceptOwnership',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: newOwner.address,
                to: store.address,
                success: true,
            });

            const ownerAddress = await store.getOwner();
            expect(ownerAddress).toEqualAddress(newOwner.address);
        });

        it('throws if there are no pending transfers', async () => {
            const newOwner = await blockchain.treasury('newOwner');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await store.send(
                newOwner.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'AcceptOwnership',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: newOwner.address,
                to: store.address,
                success: false,
                exitCode: 28480,
            });
        });

        it('throws if pending transfer is for another user', async () => {
            const newOwner = await blockchain.treasury('newOwner');
            const fakeNewOwner = await blockchain.treasury('fakeNewOwner');

            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            const sendResult = await store.send(
                fakeNewOwner.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'AcceptOwnership',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: fakeNewOwner.address,
                to: store.address,
                success: false,
                exitCode: 28480,
            });
        });

        it('setting "to" to null cancels the transfer', async () => {
            const newOwner = await blockchain.treasury('newOwner');

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            await store.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: null,
                },
            );

            const sendResult = await store.send(
                newOwner.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'AcceptOwnership',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: newOwner.address,
                to: store.address,
                success: false,
                exitCode: 28480,
            });
        });
    });
});
