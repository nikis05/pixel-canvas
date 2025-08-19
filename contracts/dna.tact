struct DinoDna {
    prenatal: PrenatalDna;
    postnatal: PostnatalDna;
    scars: Bool;
}

struct EggDna {
    tier: Int as int2;
    prenatal: PrenatalDna;
    parent1Postnatal: PostnatalDna;
    parent2Postnatal: PostnatalDna;
}

struct PrenatalDna {
    color: Allele;
    pattern: Allele;
}

struct PostnatalDna {
    habitat: Allele;
    armor: Allele;
    horns: Allele;
    tail: Allele;
    glowingEyes: Bool;
    chameleonSkin: Bool;
    lantern: Bool;
    mutability: SmallAllele;
    fertility: SmallAllele;
}

struct Allele {
    dominant: Int as uint8;
    recessive1: Int as uint8;
    recessive2: Int as uint8;
}

struct SmallAllele {
    dominant: Int as uint2;
    recessive1: Int as uint2;
    recessive2: Int as uint2;
}

fun makeEggDna(parent1: DinoDna, parent2: DinoDna): EggDna {
    let rng = makeRng(2);

    let tier = EGG_TIER_REGULAR;
    let color = combineAlleles(
        rng,
        parent1.prenatal.color,
        parent2.prenatal.color,
    );
    let pattern = combineAlleles(
        rng,
        parent1.prenatal.pattern,
        parent2.prenatal.pattern,
    );
    let parent1Postnatal = parent1.postnatal;
    let parent2Postnatal = parent2.postnatal;

    return EggDna {
        tier,
        prenatal: PrenatalDna { color, pattern },
        parent1Postnatal,
        parent2Postnatal,
    };
}

fun makeDinoDna(egg: EggDna): DinoDna {
    let rng = makeRng(3);
    let mutabilityEffect = (egg.parent1Postnatal.mutability + egg.parent2Postnatal.mutability) / 2;

    let prenatal = egg.prenatal;
    let habitat = combineAlleles(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.habitat,
        egg.parent2Postnatal.habitat,
    );
    let armor = combineAlleles(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.armor,
        egg.parent2Postnatal.armor,
    );
    let horns = combineAlleles(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.horns,
        egg.parent2Postnatal.horns,
    );
    let tail = combineAlleles(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.tail,
        egg.parent2Postnatal.tail,
    );
    let glowingEyes = combineRareTraits(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.glowingEyes,
        egg.parent2Postnatal.glowingEyes,
    );
    let chameleonSkin = combineRareTraits(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.chameleonSkin,
        egg.parent2Postnatal.chameleonSkin,
    );
    let lantern = combineRareTraits(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.lantern,
        egg.parent2Postnatal.lantern,
    );
    let mutability = combineSmallAlleles(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.mutability,
        egg.parent2Postnatal.mutability,
    );
    let fertility = combineSmallAlleles(
        rng,
        mutabilityEffect,
        egg.parent1Postnatal.fertility,
        egg.parent2Postnatal.fertility,
    );
    let scars = rng.rand() >= 50;

    return DinoDna {
        prenatal,
        postnatal: PostnatalDna {
            habitat,
            armor,
            horns,
            tail,
            glowingEyes,
            chameleonSkin,
            lantern,
            mutability,
            fertility,
        },
        scars,
    };
}

fun combineAlleles(
    rng: Rng,
    mutationProbability: Int,
    left: Allele,
    right: Allele,
): Allele {}

fun combineSmallAlleles(
    rng: Rng,
    mutationProbability: Int,
    left: SmallAllele,
    right: SmallAllele,
): SmallAllele {}

fun combineRareTraits(
    rng: Rng,
    mutationProbability: Int,
    left: Bool,
    right: Bool,
): Bool {}

fun mutationProbability(parent1Mutability: Int, parent2Mutability: Int): Int {}

fun rollDna(
    rng: Rng,
    mutationProbability: Int,
    recessive1Match: Bool,
    recessive2Match: Bool,
): Int {}

struct Rng200 { seed: Int }

fun makeRng(capacity: Int): Rng200 {
    return Rng200 { seed: random(0, 200 ^ capacity) };
}

extends mutates fun rand(self: Rng200): Int {
    let random = self.seed % 200;
    let remainder = self.seed / 200;
    self.seed = remainder;
    return random;
}

const EGG_TIER_REGULAR: Int = 0;
const EGG_TIER_SILVER: Int = 1;
const EGG_TIER_GOLD: Int = 2;
