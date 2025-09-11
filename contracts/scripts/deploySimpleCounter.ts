import { toNano } from '@ton/core';
import { SimpleCounter } from '../build/SimpleCounter/SimpleCounter_SimpleCounter';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const simpleCounter = provider.open(await SimpleCounter.fromInit(BigInt(Math.floor(Math.random() * 10000)), 0n));

    await simpleCounter.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(simpleCounter.address);

    console.log('ID', await simpleCounter.getId());
}
