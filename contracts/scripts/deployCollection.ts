import { BitString, Builder, Dictionary, toNano } from '@ton/core';
import { Collection } from '../build/Collection/Collection_Collection';
import { NetworkProvider } from '@ton/blueprint';
import { sha256, sha256_sync } from '@ton/crypto';
import { hashToInt } from '../tests/utils';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const imageUrl = await ui.input('Enter image url');
    const nftDescription = new Builder()
        .storeInt(0x00, 8)
        .storeStringTail(await ui.input('Enter NFT description'))
        .endCell();

    const collectionName = 'Pixel Canvas';
    const collectionDescription = await ui.input('Enter collection description');
    const collectionMarketplace = await ui.input('Enter marketplace URL');

    const metadata = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    metadata.set(await hashToInt('name'), new Builder().storeInt(0x00, 8).storeStringTail(collectionName).endCell());
    metadata.set(
        await hashToInt('description'),
        new Builder().storeInt(0x00, 8).storeStringTail(collectionDescription).endCell(),
    );
    metadata.set(
        await hashToInt('marketplace'),
        new Builder().storeInt(0x00, 8).storeStringTail(collectionMarketplace).endCell(),
    );

    const collectionContent = new Builder().storeUint(0x00, 8).storeDict(metadata).endCell();

    const collection = provider.open(
        await Collection.fromInit(BigInt(50000), imageUrl, nftDescription, collectionContent),
    );

    await collection.send(
        provider.sender(),
        {
            value: toNano('0.2'),
        },
        null,
    );

    await provider.waitForDeploy(collection.address);
}
