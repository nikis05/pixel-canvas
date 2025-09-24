import { NetworkProvider } from '@ton/blueprint';
import { toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';
import { Collection } from '../build/Collection/Collection_Collection';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const collectionAddress = await ui.inputAddress('Enter collection address');

    if (!(await provider.isContractDeployed(collectionAddress))) {
        ui.write(`Error: Contract at address ${collectionAddress} is not deployed!`);
        return;
    }

    const collection = provider.open(Collection.fromAddress(collectionAddress));

    await collection.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        'Stop',
    );

    await provider.waitForLastTransaction();
}
