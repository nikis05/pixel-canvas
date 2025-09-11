import { Blockchain, calcComputePhase, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { BitString, Builder, Cell, Slice, toNano, Transaction } from '@ton/core';
import { Collection, loadCollection$Data } from '../build/Collection/Collection_Collection';
import '@ton/test-utils';
import { getContractState, getTransactionFees, makeDna } from './utils';
import { describe } from 'node:test';
import { Item, storeItemCreateData, storeItemSpec, storeTitleArtist, storeTransfer } from '../build/Item/Item_Item';
import { sha256 } from '@ton/crypto';
import assert from 'node:assert';
import { loadFailedMinting, loadSuccessfulMinting, storeSuccessfulMinting } from '../build/Store/Store_Store';
import { send } from 'process';
import { cp } from 'fs';
import { storeMintForwardPayload } from '../build/Collection/Collection_Claim';

describe('Collection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let minter: SandboxContract<TreasuryContract>;
    let artist: SandboxContract<TreasuryContract>;
    let recipient: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<Collection>;
    const collectionContent = new Builder().storeInt(2, 4).endCell();

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        minter = await blockchain.treasury('minter');

        artist = await blockchain.treasury('artist');

        recipient = await blockchain.treasury('recipient');

        collection = blockchain.openContract(
            await Collection.fromInit(BigInt(2), 'https://example.com/', 'description', collectionContent),
        );
    });

    describe('empty reciever', () => {
        it('deploys', async () => {
            const deployResult = await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: collection.address,
                deploy: true,
                success: true,
            });

            const fees = getTransactionFees(deployResult.transactions[1]);

            expect(deployResult.transactions).toHaveTransaction({
                from: collection.address,
                to: deployer.address,
                value: toNano('0.4') - fees.forwardOut,
            });

            const blockchainCollection = await blockchain.getContract(collection.address);
            expect(blockchainCollection.balance).toBe(toNano('0.1') - fees.compute);
        });

        it('when already deployed, tops up balance', async () => {
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const blockchainCollection = await blockchain.getContract(collection.address);
            const balanceBeforeMsg = blockchainCollection.balance;

            const sendResult = await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                null,
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: collection.address,
                deploy: false,
                success: true,
            });

            const fees = getTransactionFees(sendResult.transactions[1]);
            const blockchainCollection2 = await blockchain.getContract(collection.address);
            const balanceAfterMsg = blockchainCollection2.balance;
            expect(balanceAfterMsg).toBe(balanceBeforeMsg + toNano('0.2') - fees.compute);
        });
    });

    describe('SetMinter', () => {
        it('sets current minter', async () => {
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: collection.address,
                success: true,
            });

            const mintResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(mintResult.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: true,
            });
        });

        it('throws if sender is not the owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: collection.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('SetDisplaySettings', () => {
        it('sets image url', async () => {
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetDisplaySettings',
                    imageUrl: 'https://new.example.com',
                    description: 'bar',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: collection.address,
                success: true,
            });

            const titleArtist = new Builder();
            storeTitleArtist({
                $$type: 'TitleArtist',
                title: 'title',
                artist: 'artist',
            })(titleArtist);

            const nftContent = await collection.getGetNftContent(BigInt(0), titleArtist.endCell());

            const descriptionKey = BigInt('0x' + (await sha256('description')).toString('hex'));
            const description = nftContent.dictionary.get(descriptionKey)?.beginParse().loadStringTail();
            expect(description).toBe('bar');

            const imageKey = BigInt('0x' + (await sha256('image')).toString('hex'));
            const image = nftContent.dictionary.get(imageKey)?.beginParse().loadStringTail();
            expect(image?.startsWith('https://new.example.com/'));
        });

        it('throws if sender is not the owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'SetDisplaySettings',
                    imageUrl: 'https://new.example.com/',
                    description: 'bar',
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: collection.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('Mint', () => {
        it('throws if sender is not the minter', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: collection.address,
                success: false,
                exitCode: 27741,
            });
        });

        it('throws if tokens sold out', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(456),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna({ fillWithOnes: true }),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            const sendResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(789),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: false,
                exitCode: 9578,
            });
        });

        it('throws if title too long', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            const sendResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'Lorem ipsum dolor sit amet, conse',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: false,
                exitCode: 25667,
            });
        });

        it('throws if artist too long', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            const sendResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'Lorem ipsum dolor sit amet, conse',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: false,
                exitCode: 17611,
            });
        });

        describe('throws if invalid DNA', () => {
            function testWithDna(make: Parameters<typeof makeDna>[0]): () => Promise<void> {
                return async () => {
                    const dna = makeDna(make);

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
                        { $$type: 'SetMinter', minterAddress: minter.address },
                    );

                    const sendResult = await collection.send(
                        minter.getSender(),
                        {
                            value: toNano('0.5'),
                        },
                        {
                            $$type: 'Mint',
                            id: BigInt(123),
                            recipient: recipient.address,
                            itemCreateData: {
                                $$type: 'ItemCreateData',

                                spec: {
                                    $$type: 'ItemSpec',
                                    title: 'title',
                                    artist: 'artist',
                                    dna,
                                },
                                artistAddress: artist.address,
                            },
                            forwardPayloadCustom: Cell.EMPTY,
                        },
                    );

                    expect(sendResult.transactions).toHaveTransaction({
                        from: minter.address,
                        to: collection.address,
                        success: false,
                        exitCode: 58433,
                    });
                };
            }

            it('non-full level 0 cell', testWithDna({ nonFullLevel0Cell: true }));

            it('missing level 1 cell', testWithDna({ missingLevel1Cell: true }));

            it('non-full level 1 cell', testWithDna({ nonFullLevel1Cell: true }));

            it('missing level 2 cell', testWithDna({ missingLevel2Cell: true }));

            it('non-full level 2 cell', testWithDna({ nonFullLevel2Cell: true }));

            it('missing level 3 cell', testWithDna({ nonFullLevel3Cell: true }));

            it('extraneous level 3 cell (leftmost branch)', testWithDna({ extraneousLevel3CellLeftmostBranch: true }));

            it('extraneous level 3 cell (other branch)', testWithDna({ extraneousLevel3CellOtherBranch: true }));

            it('non-full level 3 cell', testWithDna({ nonFullLevel3Cell: true }));

            it('incorrect size level 3 cell (rightmost)', testWithDna({ incorrectSizeLevel3CellRightmost: true }));

            it('extraneous level 4 cell', testWithDna({ extraneousLevel4Cell: true }));

            it(
                'extraneous level 4 cell (rightmost level 3 cell)',
                testWithDna({ extraneousLevel4CellRightmostLevel3Cell: true }),
            );
        });

        it('if claim is successful, deploys an item and reports revenue', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            const dna = makeDna();

            const itemCreateData = {
                $$type: 'ItemCreateData' as const,
                spec: {
                    $$type: 'ItemSpec' as const,
                    title: 'title',
                    artist: 'artist',
                    dna,
                },
                artistAddress: artist.address,
            };

            const sendResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(999),
                    recipient: recipient.address,
                    itemCreateData,
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: true,
            });

            const nftAddress = (await collection.getGetNftAddressByIndex(BigInt(0))).loadAddress();

            const customPayload = new Builder();
            storeItemCreateData(itemCreateData)(customPayload);

            const forwardPayload = new Builder();
            storeMintForwardPayload({ $$type: 'MintForwardPayload', itemIndex: BigInt(0), custom: Cell.EMPTY })(
                forwardPayload,
            );

            const transfer = new Builder();
            storeTransfer({
                $$type: 'Transfer',
                queryId: BigInt(0),
                newOwner: recipient.address,
                responseDestination: null,
                customPayload: customPayload.endCell(),
                forwardAmount: toNano('0.05'),
                forwardPayload: forwardPayload.asSlice(),
            })(transfer);

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: nftAddress,
                deploy: true,
                success: true,
                body: transfer.endCell(),
            });

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: minter.address,
            });

            const successfulMinting = loadSuccessfulMinting(sendResult.transactions[5].inMessage!.body.asSlice());
            expect(successfulMinting.$$type).toBe('SuccessfulMinting');
        });

        it('sends specified forwardPayload', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            const dna = makeDna();

            const itemCreateData = {
                $$type: 'ItemCreateData' as const,
                spec: {
                    $$type: 'ItemSpec' as const,
                    title: 'title',
                    artist: 'artist',
                    dna,
                },
                artistAddress: artist.address,
            };

            const sendResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(999),
                    recipient: recipient.address,
                    itemCreateData,
                    forwardPayloadCustom: new Builder().storeCoins(toNano('1')).endCell(),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: true,
            });

            const nftAddress = (await collection.getGetNftAddressByIndex(BigInt(0))).loadAddress();

            const customPayload = new Builder();
            storeItemCreateData(itemCreateData)(customPayload);

            const forwardPayload = new Builder();

            storeMintForwardPayload({
                $$type: 'MintForwardPayload',
                itemIndex: BigInt(0),
                custom: new Builder().storeCoins(toNano('1')).endCell(),
            })(forwardPayload);

            const transfer = new Builder();
            storeTransfer({
                $$type: 'Transfer',
                queryId: BigInt(0),
                newOwner: recipient.address,
                responseDestination: null,
                customPayload: customPayload.endCell(),
                forwardAmount: toNano('0.05'),
                forwardPayload: forwardPayload.asSlice(),
            })(transfer);

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: nftAddress,
                deploy: true,
                success: true,
                body: transfer.endCell(),
            });

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: minter.address,
            });

            const successfulMinting = loadSuccessfulMinting(sendResult.transactions[5].inMessage!.body.asSlice());
            expect(successfulMinting.$$type).toBe('SuccessfulMinting');
        });

        it('if claim is failed, reports failed claim', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            const sendResult = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(456),
                    recipient: recipient.address,
                    itemCreateData: {
                        $$type: 'ItemCreateData',

                        spec: {
                            $$type: 'ItemSpec',
                            title: 'title',
                            artist: 'artist',
                            dna: makeDna(),
                        },
                        artistAddress: artist.address,
                    },
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: collection.address,
                to: minter.address,
            });

            const failedMinting = loadFailedMinting(sendResult.transactions[4].inMessage!.body.asSlice());
            expect(failedMinting.$$type).toBe('FailedMinting');
        });

        it('correctly mints multiple items', async () => {
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
                { $$type: 'SetMinter', minterAddress: minter.address },
            );

            const itemCreateData1 = {
                $$type: 'ItemCreateData' as const,

                spec: {
                    $$type: 'ItemSpec' as const,
                    title: 'title',
                    artist: 'artist',
                    dna: makeDna(),
                },
                artistAddress: artist.address,
            };

            const sendResult1 = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: recipient.address,
                    itemCreateData: itemCreateData1,
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            const itemCreateData2 = {
                $$type: 'ItemCreateData' as const,

                spec: {
                    $$type: 'ItemSpec' as const,
                    title: 'title',
                    artist: 'artist',
                    dna: makeDna({ fillWithOnes: true }),
                },
                artistAddress: artist.address,
            };

            const sendResult2 = await collection.send(
                minter.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(456),
                    recipient: recipient.address,
                    itemCreateData: itemCreateData2,
                    forwardPayloadCustom: Cell.EMPTY,
                },
            );

            expect(sendResult1.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: true,
            });

            const nftAddress1 = (await collection.getGetNftAddressByIndex(BigInt(0))).loadAddress();

            const customPayload1 = new Builder();
            storeItemCreateData(itemCreateData1)(customPayload1);

            const forwardPayload1 = new Builder();
            storeMintForwardPayload({ $$type: 'MintForwardPayload', itemIndex: BigInt(0), custom: Cell.EMPTY })(
                forwardPayload1,
            );

            const transfer1 = new Builder();
            storeTransfer({
                $$type: 'Transfer',
                queryId: BigInt(0),
                newOwner: recipient.address,
                responseDestination: null,
                customPayload: customPayload1.endCell(),
                forwardAmount: toNano('0.05'),
                forwardPayload: forwardPayload1.asSlice(),
            })(transfer1);

            expect(sendResult1.transactions).toHaveTransaction({
                from: collection.address,
                to: nftAddress1,
                deploy: true,
                success: true,
                body: transfer1.endCell(),
            });

            expect(sendResult1.transactions).toHaveTransaction({
                from: minter.address,
                to: collection.address,
                success: true,
            });

            const nftAddress2 = (await collection.getGetNftAddressByIndex(BigInt(1))).loadAddress();

            const customPayload2 = new Builder();
            storeItemCreateData(itemCreateData2)(customPayload2);

            const forwardPayload2 = new Builder();
            storeMintForwardPayload({ $$type: 'MintForwardPayload', itemIndex: BigInt(1), custom: Cell.EMPTY })(
                forwardPayload2,
            );

            const transfer2 = new Builder();
            storeTransfer({
                $$type: 'Transfer',
                queryId: BigInt(0),
                newOwner: recipient.address,
                responseDestination: null,
                customPayload: customPayload2.endCell(),
                forwardAmount: toNano('0.05'),
                forwardPayload: forwardPayload2.asSlice(),
            })(transfer2);

            expect(sendResult2.transactions).toHaveTransaction({
                from: collection.address,
                to: nftAddress2,
                deploy: true,
                success: true,
                body: transfer2.endCell(),
            });
        });
    });

    describe('ClaimSuccess', () => {
        it('throws if not sent by the claim', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.5'),
                },
                { $$type: 'ClaimSuccess', subject: BigInt(0), data: Cell.EMPTY },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: collection.address,
                success: false,
                exitCode: 61739,
            });
        });
    });

    describe('get_collection_data', () => {
        it('returns collection data', async () => {
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const collectionData = await collection.getGetCollectionData();
            expect(collectionData.nextItemIndex).toBe(BigInt(0));
            expect(collectionData.collectionContent).toEqualCell(collectionContent);
            expect(collectionData.ownerAddress.loadAddress()).toEqualAddress(deployer.address);
        });
    });

    describe('get_nft_address_by_index', () => {
        it('returns NFT address by index', async () => {
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const nftAddress = await collection.getGetNftAddressByIndex(BigInt(0));
            expect(nftAddress.loadAddress()).toEqualAddress(
                blockchain.openContract(await Item.fromInit(collection.address, BigInt(0))).address,
            );
        });
    });

    describe('get_nft_content', () => {
        it('returns NFT content', async () => {
            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const individualContent = new Builder();
            storeTitleArtist({
                $$type: 'TitleArtist',
                title: 'Title',
                artist: 'Artist',
            })(individualContent);

            const nftContent = await collection.getGetNftContent(BigInt(9), individualContent.endCell());
            expect(nftContent.firstByte).toBe(BigInt('0x00'));

            const nameKey = BigInt('0x' + (await sha256('name')).toString('hex'));
            expect(nftContent.dictionary.get(nameKey)).toEqualCell(
                new Builder().storeStringTail('"Title" by Artist').endCell(),
            );

            const descriptionKey = BigInt('0x' + (await sha256('description')).toString('hex'));
            expect(nftContent.dictionary.get(descriptionKey)).toEqualCell(
                new Builder().storeStringTail('description').endCell(),
            );

            const imageKey = BigInt('0x' + (await sha256('image')).toString('hex'));
            expect(nftContent.dictionary.get(imageKey)).toEqualCell(
                new Builder().storeStringTail('https://example.com/9').endCell(),
            );
        });
    });

    describe('TransferOwnership', () => {
        it('throws when called by non-owner', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            const newOwner = await blockchain.treasury('newOwner');

            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
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
                to: collection.address,
                success: false,
                exitCode: 132,
            });
        });
    });

    describe('AcceptOwnership', () => {
        it('changes owner', async () => {
            const newOwner = await blockchain.treasury('newOwner');

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
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            const sendResult = await collection.send(
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
                to: collection.address,
                success: true,
            });

            const ownerAddress = await collection.getOwner();
            expect(ownerAddress).toEqualAddress(newOwner.address);
        });

        it('throws if there are no pending transfers', async () => {
            const newOwner = await blockchain.treasury('newOwner');

            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                null,
            );

            const sendResult = await collection.send(
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
                to: collection.address,
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

            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            const sendResult = await collection.send(
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
                to: collection.address,
                success: false,
                exitCode: 28480,
            });
        });

        it('setting "to" to null cancels the transfer', async () => {
            const newOwner = await blockchain.treasury('newOwner');

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
                    $$type: 'TransferOwnership',
                    to: newOwner.address,
                },
            );

            await collection.send(
                deployer.getSender(),
                {
                    value: toNano('0.5'),
                },
                {
                    $$type: 'TransferOwnership',
                    to: null,
                },
            );

            const sendResult = await collection.send(
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
                to: collection.address,
                success: false,
                exitCode: 28480,
            });
        });
    });
});
