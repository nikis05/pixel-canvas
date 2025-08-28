import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Store } from '../build/Store/Store_Store';
import '@ton/test-utils';

describe('Store', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let store: SandboxContract<Store>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        store = blockchain.openContract(await Store.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await store.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: store.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and store are ready to use
    });
});
