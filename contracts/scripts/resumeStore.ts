import { NetworkProvider } from '@ton/blueprint';
import { toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const storeAddress = await ui.inputAddress('Enter store address');

    if (!(await provider.isContractDeployed(storeAddress))) {
        ui.write(`Error: Contract at address ${storeAddress} is not deployed!`);
        return;
    }

    const store = provider.open(Store.fromAddress(storeAddress));

    await store.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        'Resume',
    );

    await provider.waitForLastTransaction();
}
