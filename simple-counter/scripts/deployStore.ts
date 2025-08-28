import { toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const store = provider.open(await Store.fromInit());

    await store.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(store.address);

    // run methods on `store`
}
