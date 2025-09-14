import { NetworkProvider } from '@ton/blueprint';
import { Builder, Dictionary, toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';
import { Collection } from '../build/Collection/Collection_Collection';
import { hashToInt } from '../tests/utils';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const collectionAddress = await ui.inputAddress('Enter collection address');

    if (!(await provider.isContractDeployed(collectionAddress))) {
        ui.write(`Error: Contract at address ${collectionAddress} is not deployed!`);
        return;
    }

    const imageUrl = await ui.input('Enter image URL');
    const collectionName = 'Pixel Canvas';
    const collectionDescription = await ui.input('Enter collection description');
    const collectionMarketplace = await ui.input('Enter marketplace URL');

    const metadata = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
    metadata.set(await hashToInt('name'), new Builder().storeInt(0x00, 8).storeStringTail(collectionName).endCell());
    metadata.set(
        await hashToInt('description'),
        new Builder().storeInt(0x00, 8).storeStringTail(collectionDescription).endCell(),
    );
    metadata.set(
        await hashToInt('marketplace'),
        new Builder().storeInt(0x00, 8).storeStringTail(collectionMarketplace).endCell(),
    );

    const collectionContent = new Builder().storeUint(0x00, 8).storeDict(metadata).endCell();

    const collection = provider.open(Collection.fromAddress(collectionAddress));

    await collection.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'SetDisplaySettings',
            imageUrl,
            collectionContent,
        },
    );

    await provider.waitForLastTransaction();
}
