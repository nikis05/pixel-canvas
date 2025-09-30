import "@stdlib/ownable";

trait SafeTransferable with Ownable {
    owner: Address;
    pendingOwnershipTransfer: Address?;

    receive(msg: TransferOwnership) {
        let sender: Address = sender();
        self.requireOwner();
        self.pendingOwnershipTransfer = msg.to;
        cashback(sender);
    }

    receive(msg: AcceptOwnership) {
        let sender: Address = sender();
        require(self.pendingOwnershipTransfer == sender, "Unauthorized to accept ownership");
        self.pendingOwnershipTransfer = null;
        self.owner = sender;
        cashback(sender);
    }
}

message(0x76b47e33) TransferOwnership {
    to: Address?;
}

message(0x10f842bd) AcceptOwnership {}
