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
        if (msg.forward_amount > 0) {
            coinsRemaining -= (msg.forward_amount + forwardFee);
        }
        if (msg.response_destination != null) {
            coinsRemaining -= forwardFee;
        }
        require(coinsRemaining >= ton("0.1"), "Insufficient contract balance");
        if (!self.is_initialized) {
            require(sender == collection_address, "Not yet initialized");
            self.isInitialized = true;
            self.spec = ItemSpec.fromCell(msg.custom_payload);
        } else {
            require(sender == self.owner, "Not the owner");
        }
        self.owner = msg.new_owner;
        if (msg.forward_amount > 0) {
            message(SendParameters {
                to: msg.new_owner,
                value: msg.forward_amount,
                mode: SendPayGasSeparately,
                bounce: true,
                body: OwnershipAssigned {
                    query_id: msg.query_id,
                    prev_owner: sender,
                    forward_payload: msg.forward_payload,
                }.toCell(),
            });
        }
        if (msg.response_destination) {
            message(MessageParameters {
                to: msg.response_destination,
                value: coinsRemaining,
                mode: SendPayGasSeparately,
                bounce: true,
                body: Excesses {},
            });
        }
    }
}

message(0x5fcc3d14) Transfer {
    query_id: Int as uint64;
    new_owner: Address;
    response_destination: Address?;
    custom_payload: Cell?;
    forward_amount: Int as coins;
    forward_payload: Slice as remaining;
}

message Excesses {}

struct ItemSpec {
    title: String;
    artist: String;
    dna: Cell;
}
