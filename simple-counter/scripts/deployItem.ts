import { toNano } from '@ton/core';
import { Item } from '../build/Item/Item_Item';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const item = provider.open(await Item.fromInit());

    await item.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(item.address);

    // run methods on `item`
}
