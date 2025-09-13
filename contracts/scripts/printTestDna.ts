import { NetworkProvider } from '@ton/blueprint';
import { Builder, Cell } from '@ton/core';
import { makeDna } from '../tests/utils';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const kind = await ui.choose('Choose DNA kind to print', ['black', 'white', 'invalid'] as const, (opt) => opt);

    const dna =
        kind == 'black'
            ? makeDna()
            : kind == 'white'
              ? makeDna({ fillWithOnes: true })
              : makeDna({ nonFullLevel0Cell: true });

    ui.write(dna.toBoc().toString('base64'));
}
