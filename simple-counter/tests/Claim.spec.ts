import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Claim } from '../build/Claim/Claim_Claim';
import '@ton/test-utils';

describe('Claim', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let claim: SandboxContract<Claim>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        claim = blockchain.openContract(await Claim.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await claim.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: claim.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and claim are ready to use
    });
});
