import { Blockchain, calcComputePhase, printTransactionFees, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { BitString, Builder, Cell, toNano, Transaction } from '@ton/core';
import { Collection, loadCollection$Data } from '../build/Collection/Collection_Collection';
import '@ton/test-utils';
import { getContractState, getTransactionFees } from './utils';
import { describe } from 'node:test';
import { storeItemSpec, storeTitleArtist } from '../build/Item/Item_Item';
import { sha256 } from '@ton/crypto';
import { assert } from 'console';
import { loadSuccessfulMinting } from '../build/Store/Store_Store';
import { send } from 'process';

describe('Collection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let collection: SandboxContract<Collection>;
    let minter: SandboxContract<TreasuryContract>;
    let artist: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        minter = await blockchain.treasury('minter');

        artist = await blockchain.treasury('artist');

        collection = blockchain.openContract(
            await Collection.fromInit(BigInt(2), 'https://example.com', 'foo', new Builder().storeInt(2, 4).endCell()),
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
                    value: toNano('0.1'),
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
                    value: toNano('0.1'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: minter.address,
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
                    value: toNano('0.1'),
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
                    value: toNano('0.1'),
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
            expect(image?.startsWith('https://new.example.com'));
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
                    value: toNano('0.1'),
                },
                {
                    $$type: 'SetDisplaySettings',
                    imageUrl: 'https://new.example.com',
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
                    value: toNano('0.1'),
                },
                {
                    $$type: 'Mint',
                    id: BigInt(123),
                    recipient: minter.address,
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
                    value: toNano('0.1'),
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
                    recipient: minter.address,
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
                    recipient: minter.address,
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
                    recipient: minter.address,
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
                    value: toNano('0.1'),
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
                    recipient: minter.address,
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
                    value: toNano('0.1'),
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
                    recipient: minter.address,
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
                            value: toNano('0.1'),
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
                            recipient: minter.address,
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

        it.todo('if claim is successful, deploys an item and reports revenue');

        it.todo('if claim is failed, reports failed claim');

        it.todo('correctly mints multiple items');
    });

    describe('ClaimSuccess', () => {
        it.todo('throws if not sent by the claim');
    });

    describe('get_collection_data', () => {
        it.todo('returns collection data');
    });

    describe('get_nft_address_by_index', () => {
        it.todo('returns NFT address by index');
    });

    describe('get_nft_content', () => {
        it.todo('returns NFT content');
    });
});

function makeDna({
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
