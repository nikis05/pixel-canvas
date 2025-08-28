const DESCRIPTION: String = "An NFT art created via PixelCanvas";

contract Item {
    collectionAddress: Address;
    itemIndex: Int;
    isInitialized: Bool = false;

    owner: Address?;
    spec: ItemSpec?;

    init(collectionAddress: Address, itemIndex: Int) {
        require(sender() == collectionAddress, "Invalid sender");
        self.collectionAddress = collectionAddress;
        self.itemIndex = itemIndex;
    }

    receive(msg: Transfer) {
        let sender: Address = sender();
        let coinsRemaining: Int = myBalance();
        let forwardFee = context().readForwardFee();
        if (msg.forwardAmount > 0) {
            coinsRemaining -= (msg.forwardAmount + forwardFee);
        }
        if (msg.responseDestination != null) {
            coinsRemaining -= forwardFee;
        }
        require(coinsRemaining >= ton("0.1"), "Insufficient contract balance");
        if (!self.is_initialized) {
            require(sender == collection_address, "Not yet initialized");
            self.isInitialized = true;
            self.spec = ItemSpec.fromCell(msg.customPayload);
            self.imageUrl = data.imageUrl;
        } else {
            require(sender == self.owner, "Not the owner");
        }
        self.owner = msg.newOwner;
        if (msg.forwardAmount > 0) {
            message(SendParameters {
                to: msg.newOwner,
                value: msg.forwardAmount,
                mode: SendPayGasSeparately,
                bounce: true,
                body: OwnershipAssigned {
                    queryId: msg.queryId,
                    prevOwner: sender,
                    forwardPayload: msg.forwardPayload,
                }.toCell(),
            });
        }
        if (msg.responseDestination) {
            message(MessageParameters {
                to: msg.responseDestination,
                value: coinsRemaining,
                mode: SendPayGasSeparately,
                bounce: true,
                body: Excesses {
                    queryId: msg.queryId,
                },
            });
        }
    }

    receive(msg: GetStaticData) {
        send(SendParameters {
            to: sender(),
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: ReportStaticData {
                queryId: msg.queryId,
                indexId: self.itemIndex,
                collection: self.collectionAddress,
            }.toCell(),
        });
    }

    get fun get_nft_data() {
        return GetNftData {
            isInitialized: self.isInitialized,
            index: self.itemIndex,
            collectionAddress: self.collectionAddress,
            ownerAddress: self.owner,
            individualContent: emptyCell(),
        };
    }

    receive(msg: RefreshImageUrl) {
        require(sender() == self.collectionAddress);
        self.imageUrl = msg.newUrl;
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
    indexId: Int;
    collection: Address;
}

message RefreshImageUrl {
    newUrl: String;
}

struct ItemSpec {
    title: String;
    artist: String;
    dna: Cell;
}

struct GetNftData {
    isInitialized: Bool;
    index: Int;
    collectionAddress: Address;
    ownerAddress: Address;
    individualContent: Cell;
}
