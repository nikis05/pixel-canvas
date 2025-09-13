import { NetworkProvider } from '@ton/blueprint';
import { Store } from '../build/Store/Store_Store';
import { Cell, toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const storeAddress = await ui.inputAddress('Enter store address');

    if (!(await provider.isContractDeployed(storeAddress))) {
        ui.write(`Error: Contract at address ${storeAddress} is not deployed!`);
        return;
    }

    const title = await ui.input('Enter NFT title');
    const artist = await ui.input('Enter NFT artist');
    const dna = Cell.fromBase64(await ui.input('Enter DNA string'));

    const store = provider.open(Store.fromAddress(storeAddress));

    const itemPrice = await store.getItemPrice();

    await store.send(
        provider.sender(),
        {
            value: itemPrice,
        },
        {
            $$type: 'Bake',
            spec: {
                $$type: 'ItemSpec',
                title,
                artist,
                dna,
            },
            giftTo: null,
            offerExclusive: null,
        },
    );

    await provider.waitForLastTransaction();
}
