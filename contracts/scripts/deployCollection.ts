import { toNano } from '@ton/core';
import { Collection } from '../build/Collection/Collection_Collection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const collection = provider.open(await Collection.fromInit());

    await collection.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(collection.address);

    // run methods on `collection`
}
