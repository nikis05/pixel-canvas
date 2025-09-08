import "./collection.tact";
import "./item.tact";
import "./safe_transferable";

contract Store with SafeTransferable {
    owner: Address;
    collection: Address;

    pendingOwnershipTransfer: Address? = null;

    pendingPurchases: map<Int as int224, Address> = emptyMap();
    numPendingPurchases: Int as uint10 = 0;

    closed: Bool = false;

    init(owner: Address, collection: Address) {
        self.owner = owner;
        self.collection = collection;
    }

    receive(msg: Purchase) {
        require(!self.closed, "Sorry, shop is temporarily closed");
        require(context().value == ton("4.99"), "Invalid message value");
        require(self.numPendingPurchases <= 1000, "Too many pending requests, try again later");

        let sender: Address = sender();

        let id = msg.spec.toCell().hash();
        self.pendingPurchases.set(id, sender);
        self.numPendingPurchases += 1;

        message(MessageParameters {
            to: self.collection,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: Mint {
                id,
                recipient: sender,
                itemCreateData: ItemCreateData {
                    spec: msg.spec,
                    artistAddress: sender,
                },
            }.toCell(),
        });
    }

    receive(msg: SuccessfulMinting) {
        self.closePurchase(msg.id);
    }

    receive(msg: FailedMinting) {
        self.cancelPurchase(msg.id);
    }

    bounced(msg: bounced<Mint>) {
        self.cancelPurchase(msg.id);
    }

    fun closePurchase(id: Int) {
        self.pendingPurchases.del(id);
        self.numPendingPurchases -= 1;
    }

    fun cancelPurchase(id: Int) {
        self.closePurchase(id);
        let recipient: Address = self.pendingPurchases.get(id)!!;
        message(MessageParameters {
            to: recipient,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: FailedPurchase {}.toCell(),
        });
    }

    receive(msg: Withdraw) {
        self.requireOwner();
        message(MessageParameters {
            to: self.owner,
            value: myBalance() - ton("0.2"),
            bounce: true,
        });
    }

    receive(msg: SetClosed) {
        self.requireOwner();
        self.closed == msg.closed;
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
}

message(0xf0f7c18a) Purchase {
    spec: ItemSpec;
}

message(0x435e0ccd) FailedPurchase {}

message(0x2365d020) Withdraw {}

message(0xb722c4ae) Terminate {}

message SetClosed { closed: Bool }
