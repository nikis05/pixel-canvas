import { toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const collectionAddress = await ui.inputAddress('Enter collection address');
    const itemPrice = toNano(await ui.input('Enter item price'));

    const store = provider.open(await Store.fromInit(collectionAddress, itemPrice));

    await store.send(
        provider.sender(),
        {
            value: toNano('0.2'),
        },
        null,
    );

    await provider.waitForDeploy(store.address);
}
