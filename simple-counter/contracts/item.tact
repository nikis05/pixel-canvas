import "./issuable.tact";
import "./destroy.tact";

contract Item with Issuable {
    collectionAddress: Address;
    itemIndex: Int as uint32;
    initialized: Bool = false;
    owner: Address;

    spec: ItemSpec?;
    artistAddress: Address?;

    init(collectionAddress: Address, itemIndex: Int) {
        self.collectionAddress = collectionAddress;
        self.itemIndex = itemIndex;
        self.owner = collectionAddress;
    }

    receive() {
        if (!self.initialized) {
            destroy(sender());
        }
    }

    receive(msg: Transfer) {
        if (!self.initialized) {
            if (self.destroyIfWrongIssuer()) {
                return;
            }
            self.initialized = true;
            let itemCreateData = ItemCreateData.fromCell(msg.customPayload!!);
            self.spec = itemCreateData.spec;
            self.artistAddress = itemCreateData.artistAddress;
        } else {
            let sender: Address = sender();
            require(sender == self.owner, "Not the owner");
            require(myBalance() >= ton("0.1"), "Insufficient contract balance");
            let ctx: Context = context();
            let coinsRemaining: Int = ctx.value;
            let forwardFee = ctx.readForwardFee();
            if (msg.forwardAmount > 0) {
                coinsRemaining -= (msg.forwardAmount + forwardFee);
            }
            if (msg.responseDestination != null) {
                coinsRemaining -= forwardFee;
            }
            require(coinsRemaining >= 1, "Insufficient message value");
            if (msg.responseDestination != null) {
                message(MessageParameters {
                    to: msg.responseDestination!!,
                    value: coinsRemaining,
                    mode: SendPayGasSeparately,
                    bounce: true,
                    body: Excesses {
                        queryId: msg.queryId,
                    }.toCell(),
                });
            }
        }
        if (msg.forwardAmount > 0) {
            message(MessageParameters {
                to: msg.newOwner,
                value: msg.forwardAmount,
                mode: SendPayGasSeparately,
                bounce: true,
                body: OwnershipAssigned {
                    queryId: msg.queryId,
                    prevOwner: self.owner,
                    forwardPayload: msg.forwardPayload,
                }.toCell(),
            });
        }
        self.owner = msg.newOwner;
    }

    receive(msg: GetStaticData) {
        let sender: Address = sender();
        if (!self.initialized) {
            destroy(sender);
            return;
        }
        send(SendParameters {
            to: sender,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: ReportStaticData {
                queryId: msg.queryId,
                index: self.itemIndex,
                collection: self.collectionAddress,
            }.toCell(),
        });
    }

    bounced(msg: Slice) {}

    get fun get_nft_data(): GetNftData {
        return GetNftData {
            isInitialized: self.initialized ? 1 : 0,
            index: self.itemIndex,
            collectionAddress: self.collectionAddress.asSlice(),
            ownerAddress: self.owner.asSlice(),
            individualContent: self.spec != null
                ? TitleArtist {
                    title: self.spec!!.title,
                    artist: self.spec!!.artist,
                }.toCell()
                : emptyCell(),
        };
    }

    get fun artist_address(): Address? {
        return self.artistAddress;
    }

    get fun dna(): Cell? {
        return self.spec != null ? self.spec!!.dna : null;
    }

    override inline fun issuer(): Address {
        return self.collectionAddress;
    }
}

message(0x5fcc3d14) Transfer {
    queryId: Int as uint64;
    newOwner: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x05138d91) OwnershipAssigned {
    queryId: Int as uint64;
    prevOwner: Address;
    forwardPayload: Slice as remaining;
}

message(0xd53276db) Excesses {
    queryId: Int as uint64;
}

message(0x2fcb26a2) GetStaticData {
    queryId: Int as uint64;
}

message(0x8b771735) ReportStaticData {
    queryId: Int as uint64;
    index: Int;
    collection: Address;
}

struct ItemSpec {
    title: String;
    artist: String;
    dna: Cell;
}

struct ItemCreateData {
    spec: ItemSpec;
    artistAddress: Address;
}

struct TitleArtist {
    title: String;
    artist: String;
}

struct GetNftData {
    isInitialized: Int?;
    index: Int;
    collectionAddress: Slice;
    ownerAddress: Slice;
    individualContent: Cell;
}
