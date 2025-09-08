import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { BitString, Builder, Cell, SendMode, toNano } from '@ton/core';
import { Item, storeItemCreateData } from '../build/Item/Item_Item';
import '@ton/test-utils';
import {
    storeExcesses,
    storeItemSpec,
    storeOwnershipAssigned,
    storeReportStaticData,
    storeTitleArtist,
} from '../build/Collection/Collection_Collection';
import { getTransactionFees, getTransactionValue } from './utils';

describe('Item', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let owner: SandboxContract<TreasuryContract>;
    let newOwner: SandboxContract<TreasuryContract>;
    let artist: SandboxContract<TreasuryContract>;
    let item: SandboxContract<Item>;
    let customPayload: Cell;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        owner = await blockchain.treasury('owner');

        newOwner = await blockchain.treasury('newOwner');

        artist = await blockchain.treasury('artist');

        item = blockchain.openContract(await Item.fromInit(deployer.address, BigInt(111)));

        const customPayloadBuilder = new Builder();
        storeItemCreateData({
            $$type: 'ItemCreateData',
            spec: {
                $$type: 'ItemSpec',
                artist: 'artist',
                title: 'title',
                dna: new Builder().storeInt(2, 4).endCell(),
            },
            artistAddress: artist.address,
        })(customPayloadBuilder);

        customPayload = customPayloadBuilder.endCell();
    });

    describe('deploy', () => {
        it('deploys', async () => {
            const deployResult = await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: item.address,
                deploy: true,
                success: true,
            });
        });

        it('self-destructs if created by wrong sender (Transfer)', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            const deployResult = await item.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: item.address,
                deploy: false,
                success: true,
            });

            expect(deployResult.transactions).toHaveTransaction({
                from: item.address,
                to: wrongSender.address,
                body: Cell.EMPTY,
                mode: SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.DESTROY_ACCOUNT_IF_ZERO,
                inMessageBounceable: false,
                value: toNano('0.2') - getTransactionFees(deployResult.transactions[1]).total,
            });

            const blockchainItem = await blockchain.getContract(item.address);
            expect(blockchainItem.accountState).toBe(undefined);

            const deployResult2 = await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(deployResult2.transactions).toHaveTransaction({
                from: deployer.address,
                to: item.address,
                deploy: true,
                success: true,
            });
        });

        it('self-destructs if created by wrong sender (GetStaticData)', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            const deployResult = await item.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'GetStaticData',
                    queryId: BigInt(123),
                },
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: item.address,
                deploy: false,
                success: true,
            });

            expect(deployResult.transactions).toHaveTransaction({
                from: item.address,
                to: wrongSender.address,
                body: Cell.EMPTY,
                mode: SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.DESTROY_ACCOUNT_IF_ZERO,
                inMessageBounceable: false,
                value: toNano('0.2') - getTransactionFees(deployResult.transactions[1]).total,
            });

            const blockchainItem = await blockchain.getContract(item.address);
            expect(blockchainItem.accountState).toBe(undefined);

            const deployResult2 = await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(deployResult2.transactions).toHaveTransaction({
                from: deployer.address,
                to: item.address,
                deploy: true,
                success: true,
            });
        });

        it('self-destructs if created by wrong sender (empty reciever)', async () => {
            const wrongSender = await blockchain.treasury('wrongSender');
            const deployResult = await item.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.2'),
                },
                null,
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: item.address,
                deploy: false,
                success: true,
            });

            expect(deployResult.transactions).toHaveTransaction({
                from: item.address,
                to: wrongSender.address,
                body: Cell.EMPTY,
                mode: SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.DESTROY_ACCOUNT_IF_ZERO,
                inMessageBounceable: false,
                value: toNano('0.2') - getTransactionFees(deployResult.transactions[1]).total,
            });

            const blockchainItem = await blockchain.getContract(item.address);
            expect(blockchainItem.accountState).toBe(undefined);

            const deployResult2 = await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(deployResult2.transactions).toHaveTransaction({
                from: deployer.address,
                to: item.address,
                deploy: true,
                success: true,
            });
        });
    });

    describe('Transfer', () => {
        it('initializes if not initialized', async () => {
            const deployResult = await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(deployResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: item.address,
                op: 0x5fcc3d14,
                deploy: true,
                success: true,
            });

            const nftData = await item.getGetNftData();
            const titleArtist = new Builder();
            storeTitleArtist({ $$type: 'TitleArtist', title: 'title', artist: 'artist' })(titleArtist);

            expect(nftData.isInitialized).toBe(BigInt(1));
            expect(nftData.ownerAddress).toEqualSlice(new Builder().storeAddress(owner.address).asSlice());
            expect(nftData.individualContent).toEqualCell(titleArtist.endCell());
        });

        it('changes the owner', async () => {
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const sendResult = await item.send(
                owner.getSender(),
                {
                    value: toNano('0.01'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(456),
                    newOwner: newOwner.address,
                    responseDestination: null,
                    customPayload: null,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: owner.address,
                to: item.address,
                op: 0x5fcc3d14,
                success: true,
            });

            const nftData = await item.getGetNftData();
            expect(nftData.ownerAddress).toEqualSlice(new Builder().storeAddress(newOwner.address).asSlice());
        });

        it('throws if insufficient contract balance', async () => {
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.05'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const sendResult = await item.send(
                owner.getSender(),
                {
                    value: toNano('0.01'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(456),
                    newOwner: newOwner.address,
                    responseDestination: null,
                    customPayload: null,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: owner.address,
                to: item.address,
                op: 0x5fcc3d14,
                success: false,
                exitCode: 55591,
            });
        });

        it('throws if initialized and not called by owner', async () => {
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const wrongSender = await blockchain.treasury('wrongSender');

            const sendResult = await item.send(
                wrongSender.getSender(),
                {
                    value: toNano('0.01'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(456),
                    newOwner: newOwner.address,
                    responseDestination: null,
                    customPayload: null,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: wrongSender.address,
                to: item.address,
                op: 0x5fcc3d14,
                success: false,
                exitCode: 54727,
            });
        });

        it('if forwardAmount is not 0, sends an OwnershipAssigned message to the new owner', async () => {
            const forwardPayload = new Builder().storeInt(9, 6).endCell().asSlice();
            const deployResult = await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(999),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano('0.05'),
                    forwardPayload,
                },
            );

            const ownershipAssigned = new Builder();
            storeOwnershipAssigned({
                $$type: 'OwnershipAssigned',
                queryId: BigInt(999),
                prevOwner: deployer.address,
                forwardPayload,
            })(ownershipAssigned);

            expect(deployResult.transactions).toHaveTransaction({
                from: item.address,
                to: owner.address,
                op: 0x05138d91,
                value: toNano('0.05'),
                body: ownershipAssigned.endCell(),
            });
        });

        it('if responseDestination is not null, sends excesses to response destination', async () => {
            const responseDestination = await blockchain.treasury('responseDestination');
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const sendResult = await item.send(
                owner.getSender(),
                {
                    value: toNano('0.1'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(777),
                    newOwner: newOwner.address,
                    responseDestination: responseDestination.address,
                    customPayload: null,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const excesses = new Builder();
            storeExcesses({ $$type: 'Excesses', queryId: BigInt(777) })(excesses);

            expect(sendResult.transactions).toHaveTransaction({
                from: item.address,
                to: responseDestination.address,
                op: 0xd53276db,
                body: excesses.endCell(),
            });

            const approximateActualValue = Math.floor(Number(getTransactionValue(sendResult.transactions[2])) / 100);
            const approximateExpectedValue = Math.floor(
                Number(
                    toNano('0.1') - (getTransactionFees(sendResult.transactions[1]).forwardIn * BigInt(3)) / BigInt(2),
                ) / 100,
            );
            expect(approximateActualValue).toBe(approximateExpectedValue);
        });

        it('supports forwardAmount and responseDestination at once', async () => {
            const forwardPayload = new Builder().storeInt(9, 6).endCell().asSlice();
            const responseDestination = await blockchain.treasury('responseDestination');
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const sendResult = await item.send(
                owner.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(888),
                    newOwner: newOwner.address,
                    responseDestination: responseDestination.address,
                    customPayload: null,
                    forwardAmount: toNano('0.1'),
                    forwardPayload,
                },
            );

            const ownershipAssigned = new Builder();
            storeOwnershipAssigned({
                $$type: 'OwnershipAssigned',
                queryId: BigInt(888),
                prevOwner: owner.address,
                forwardPayload,
            })(ownershipAssigned);

            expect(sendResult.transactions).toHaveTransaction({
                from: item.address,
                to: newOwner.address,
                op: 0x05138d91,
                value: toNano('0.1'),
                body: ownershipAssigned.endCell(),
            });

            const excesses = new Builder();
            storeExcesses({ $$type: 'Excesses', queryId: BigInt(888) })(excesses);

            expect(sendResult.transactions).toHaveTransaction({
                from: item.address,
                to: responseDestination.address,
                op: 0xd53276db,
                body: excesses.endCell(),
            });

            const approximateActualValue = Math.floor(Number(getTransactionValue(sendResult.transactions[2])) / 1000);
            const approximateExpectedValue = Math.floor(
                Number(toNano('0.1') - getTransactionFees(sendResult.transactions[1]).forwardIn * BigInt(3)) / 1000,
            );
            expect(approximateActualValue).toBe(approximateExpectedValue);
        });

        it('throws if message value is insufficient to complete the operation', async () => {
            const forwardPayload = new Builder().storeInt(9, 6).endCell().asSlice();
            const responseDestination = await blockchain.treasury('responseDestination');
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const sendResult = await item.send(
                owner.getSender(),
                {
                    value: toNano('0.1'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(888),
                    newOwner: newOwner.address,
                    responseDestination: responseDestination.address,
                    customPayload: null,
                    forwardAmount: toNano('0.1'),
                    forwardPayload,
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: owner.address,
                to: item.address,
                success: false,
                exitCode: 38086,
            });
        });
    });

    describe('GetStaticData', () => {
        it('sends a ReportStaticData message to the sender', async () => {
            const getter = await blockchain.treasury('getter');

            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const sendResult = await item.send(
                getter.getSender(),
                {
                    value: toNano('0.1'),
                },
                {
                    $$type: 'GetStaticData',
                    queryId: BigInt(555),
                },
            );

            expect(sendResult.transactions).toHaveTransaction({
                from: getter.address,
                to: item.address,
                op: 0x2fcb26a2,
                success: true,
            });

            const reportStaticData = new Builder();
            storeReportStaticData({
                $$type: 'ReportStaticData',
                queryId: BigInt(555),
                index: BigInt(111),
                collection: deployer.address,
            })(reportStaticData);

            expect(sendResult.transactions).toHaveTransaction({
                from: item.address,
                to: getter.address,
                mode: 64,
                op: 0x8b771735,
                body: reportStaticData.endCell(),
            });
        });
    });

    describe('get_nft_data', () => {
        it('returns NFT data', async () => {
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const data = await item.getGetNftData();
            const titleArtist = new Builder();
            storeTitleArtist({ $$type: 'TitleArtist', title: 'title', artist: 'artist' })(titleArtist);

            expect(data.isInitialized).toBe(BigInt(1));
            expect(data.index).toBe(BigInt(111));
            expect(data.collectionAddress).toEqualSlice(new Builder().storeAddress(deployer.address).asSlice());
            expect(data.ownerAddress).toEqualSlice(new Builder().storeAddress(owner.address).asSlice());
            expect(data.individualContent).toEqualCell(titleArtist.endCell());
        });
    });

    describe('get_artist_address', () => {
        it('should return artist address', async () => {
            await item.send(
                deployer.getSender(),
                {
                    value: toNano('0.2'),
                },
                {
                    $$type: 'Transfer',
                    queryId: BigInt(123),
                    newOwner: owner.address,
                    responseDestination: null,
                    customPayload,
                    forwardAmount: toNano(0),
                    forwardPayload: Cell.EMPTY.asSlice(),
                },
            );

            const artistAddress = await item.getArtistAddress();
            expect(artistAddress).toEqualAddress(artist.address);
        });
    });
});
