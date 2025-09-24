import { NetworkProvider } from '@ton/blueprint';
import { Item } from '../build/Collection/Collection_Item';
import { toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const itemAddress = await ui.inputAddress('Enter item address');
    const value = toNano(await ui.input('Enter amount'));

    if (!(await provider.isContractDeployed(itemAddress))) {
        ui.write(`Error: Contract at address ${itemAddress} is not deployed!`);
        return;
    }

    const item = provider.open(Item.fromAddress(itemAddress));

    await item.send(
        provider.sender(),
        {
            value,
        },
        null,
    );

    await provider.waitForLastTransaction();
}
