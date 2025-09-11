import "./collection.tact";
import "./item.tact";
import "./safe_transferable";

contract Store with SafeTransferable {
    owner: Address;
    collection: Address;

    initialized: Bool = false;

    pendingOwnershipTransfer: Address? = null;

    pendingPurchases: map<Int as uint224, Address> = emptyMap();
    numPendingPurchases: Int as uint10 = 0;

    closed: Bool = false;

    exclusivesOffered: map<Int as uint32, Int> = emptyMap();

    init(collection: Address) {
        self.owner = sender();
        self.collection = collection;
    }

    receive() {
        if (self.initialized) {
            return;
        }
        self.initialized = true;
        message(MessageParameters {
            to: sender(),
            value: afterReserve(),
            bounce: true,
        });
    }

    receive(msg: Bake) {
        require(!self.closed, "The shop is temporarily closed");

        if (msg.giftTo != null) {
            self.requireOwner();
            require(msg.offerExclusive == null, "Cannot giftTo and offerExclusive in the same message");
            require(context().value == ton("0.5"), "Invalid message value");
        } else if (msg.offerExclusive != null) {
            self.requireOwner();
            require(context().value == ton("0.5"), "Invalid message value");
            require(msg.offerExclusive!! >= ton("0.5"), "Price is too low");
        } else {
            require(context().value == ton("4.99"), "Invalid message value");
        }

        require(self.numPendingPurchases <= 1000, "Too many pending requests, try again later");

        let sender: Address = sender();

        let id: Int = idFromDna(msg.spec.dna.hash());

        require(!self.pendingPurchases.exists(id), "There is a transaction in progress for this item");
        self.pendingPurchases.set(id, sender);
        self.numPendingPurchases += 1;

        message(MessageParameters {
            to: self.collection,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: Mint {
                id,
                recipient: msg.giftTo != null
                    ? msg.giftTo!!
                    : msg.offerExclusive != null ? myAddress() : sender,
                itemCreateData: ItemCreateData {
                    spec: msg.spec,
                    artistAddress: sender,
                },
                forwardPayloadCustom: msg.offerExclusive != null
                    ? ForwardPayloadCustom { price: msg.offerExclusive!! }.toCell()
                    : emptyCell(),
            }.toCell(),
        });
    }

    receive(msg: SuccessfulMinting) {
        require(sender() == self.collection, "Wrong sender");
        self.closePurchase(msg.id);
    }

    receive(msg: FailedMinting) {
        require(sender() == self.collection, "Wrong sender");
        self.cancelPurchase(msg.id);
    }

    bounced(msg: bounced<Mint>) {
        self.cancelPurchase(msg.id);
    }

    receive(msg: PurchaseExclusive) {
        let itemIndex: Int = msg.itemIndex;
        let itemPrice: Int? = self.exclusivesOffered.get(itemIndex);
        require(itemPrice != null, "No such item");
        require(context().value == itemPrice, "Invalid message value");
        self.exclusivesOffered.del(itemIndex);
        message(MessageParameters {
            to: contractAddress(initOf Item(self.collection, itemIndex)),
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: Transfer {
                queryId: 0,
                newOwner: sender(),
                responseDestination: myAddress(),
                customPayload: null,
                forwardAmount: ton("0.05"),
                forwardPayload: emptySlice(),
            }.toCell(),
        });
    }

    receive(msg: RemoveExclusive) {
        self.requireOwner();
        let itemIndex: Int = msg.itemIndex;
        if (self.exclusivesOffered.del(itemIndex)) {
            message(MessageParameters {
                to: contractAddress(initOf Item(self.collection, itemIndex)),
                value: 0,
                mode: SendRemainingValue,
                bounce: true,
                body: Transfer {
                    queryId: 0,
                    newOwner: self.owner,
                    responseDestination: myAddress(),
                    customPayload: null,
                    forwardAmount: ton("0.05"),
                    forwardPayload: emptySlice(),
                }.toCell(),
            });
        }
    }

    receive(msg: OwnershipAssigned) {
        let forwardPayload: MintForwardPayload = MintForwardPayload.fromSlice(msg.forwardPayload);
        let itemIndex: Int = forwardPayload.itemIndex;
        require(sender() == contractAddress(initOf Item(self.collection, itemIndex)), "Wrong sender");
        let forwardPayloadCustom: ForwardPayloadCustom = ForwardPayloadCustom.fromCell(forwardPayload.custom);
        self.exclusivesOffered.set(itemIndex, forwardPayloadCustom.price);
    }

    receive(msg: Withdraw) {
        self.requireOwner();
        message(MessageParameters {
            to: self.owner,
            value: myBalance() - ton("0.1"),
            bounce: true,
        });
    }

    receive(msg: SetClosed) {
        self.requireOwner();
        self.closed = msg.closed;
    }

    receive(msg: Terminate) {
        self.requireOwner();
        require(self.numPendingPurchases == 0, "There are purchases still being processed");
        message(MessageParameters {
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance | SendDestroyIfZero,
            bounce: true,
        });
    }

    get fun exclusives_offered(): map<Int as uint32, Int> {
        return self.exclusivesOffered;
    }

    fun closePurchase(id: Int) {
        self.pendingPurchases.del(id);
        self.numPendingPurchases -= 1;
    }

    fun cancelPurchase(id: Int) {
        let recipient: Address = self.pendingPurchases.get(id)!!;
        self.closePurchase(id);
        message(MessageParameters {
            to: recipient,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: Refund {}.toCell(),
        });
    }

    bounced(msg: Slice) {}
}

message(0xf0f7c18a) Bake {
    spec: ItemSpec;
    giftTo: Address?;
    offerExclusive: Int?;
}

message(0x435e0ccd) Refund {}

message PurchaseExclusive {
    itemIndex: Int as uint32;
}

message RemoveExclusive {
    itemIndex: Int as uint32;
}

message(0x2365d020) Withdraw {}

message(0xb722c4ae) Terminate {}

message SetClosed { closed: Bool }

struct ForwardPayloadCustom {
    price: Int;
}
