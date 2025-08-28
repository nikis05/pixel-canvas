import "./collection.tact";
import "./item.tact";
import "./safe_transferable";
import "./utils";

contract Store(owner: Address, collection: Address) with SafeTransferable {
    pendingOwnershipTransfer: Address? = null;

    receive(msg: Purchase) {
        require(context().value == ton("4.99"), "Invalid message value");

        message(MessageParameters {
            to: self.collection,
            value: afterMessage(),
            bounce: true,
            body: Mint {
                recipient: sender(),
                spec: msg.spec,
            },
        });
    }

    bounced(msg: bounced<Mint>) {
        message(MessageParameters {
            to: msg.recipient,
            value: afterMessage(),
            bounce: true,
            body: FailedPurchase {},
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
}

message Purchase {
    spec: ItemSpec;
}

message FailedPurchase {}

message Withdraw {}
