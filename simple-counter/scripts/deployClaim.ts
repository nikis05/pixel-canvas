import { toNano } from '@ton/core';
import { Claim } from '../build/Claim/Claim_Claim';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const claim = provider.open(await Claim.fromInit());

    await claim.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(claim.address);

    // run methods on `claim`
}
