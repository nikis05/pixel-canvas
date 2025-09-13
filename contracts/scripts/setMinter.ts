import { NetworkProvider } from '@ton/blueprint';
import { Collection } from '../build/Collection/Collection_Collection';
import { toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const collectionAddress = await ui.inputAddress('Enter collection address');
    const minterAddress = await ui.inputAddress('Enter minter address');

    const collection = provider.open(Collection.fromAddress(collectionAddress));

    await collection.send(
        provider.sender(),
        {
            value: toNano('0.2'),
        },
        {
            $$type: 'SetMinter',
            minterAddress,
        },
    );

    await provider.waitForLastTransaction();
}
