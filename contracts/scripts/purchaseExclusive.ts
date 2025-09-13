import { NetworkProvider } from '@ton/blueprint';
import { Store } from '../build/Store/Store_Store';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const storeAddress = await ui.inputAddress('Enter store address');

    if (!(await provider.isContractDeployed(storeAddress))) {
        ui.write(`Error: Contract at address ${storeAddress} is not deployed!`);
        return;
    }

    const chosenExclusive = parseInt(await ui.input('Enter exclusive index'), 10);

    const store = provider.open(Store.fromAddress(storeAddress));

    const exclusivePrice = (await store.getExclusivesOffered()).get(chosenExclusive);

    if (!exclusivePrice) {
        ui.write('No such item');
        return;
    }

    await store.send(
        provider.sender(),
        {
            value: exclusivePrice,
        },
        {
            $$type: 'PurchaseExclusive',
            itemIndex: BigInt(chosenExclusive),
        },
    );

    await provider.waitForLastTransaction();
}
