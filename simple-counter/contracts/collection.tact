import "./claim.tact";
import "./item.tact";
import "./safe_transferable.tact";
import "./utils.tact";

contract Collection(
    owner: Address,
) with SafeTransferable {
    nextItemIndex: Int as uint16 = 0;
    minters: map<Address, Void> = emptyMap();
    pendingOwnershipTransfer: Address? = null;

    receive(msg: AddMinter) {
        let sender: Address = sender();
        self.requireOwner();
        self.minters.set(msg.minterAddress, Void {});
        cashback(sender);
    }

    receive(msg: RemoveMinter) {
        let sender: Address = sender();
        self.requireOwner();
        self.minters.del(msg.minterAddress, Void {});
        cashback(sender);
    }

    receive(msg: Mint) {
        let sender: Address = sender();
        require(self.minters.exists(sender), "Not a minter");
        require(self.nextItemIndex <= 100000, "Tokens sold out");
        require(stringLength(msg.title) <= 64, "Title too long");
        require(stringLength(msg.artist) <= 64, "Artist too long");
        require(validateDna(msg.data), "Invalid DNA");

        let dnaHash: String = msg.spec.toCell().hash();
        send(SendParameters {
            to: contractAddress(initOf Claim(myAddress(), dnaHash)),
            code: codeOf Claim,
            data: dnaHash,
            value: afterMessage(),
            bounce: true,
            body: ClaimMessage {
                successCallbackAddress: myAddress(),
                successCallbackData: SuccessCallbackData {
                    minter: sender,
                    recipient: msg.recipient,
                    spec: msg.spec,
                }.toCell(),
            },
        });
    }

    receive(msg: ClaimSuccess) {
        require(sender() == contractAddress(Claim(myAddress(), msg.subject)), "Wrong sender");
        let data: SuccessCallbackData = SuccessCallbackData.fromCell(msg.callbackData);
        deploy(DeployParameters {
            init: initOf Item(myAddress(), self.nextItemIndex),
            value: ton("0.2"),
            bounce: false,
            body: Transfer {
                query_id: 0,
                new_owner: data.recipient,
                response_destination: null,
                custom_payload: data.spec.toCell(),
                forward_amount: ton("0.05"),
                forward_payload: emptySlice(),
            },
        });
        self.nextItemIndex += 1;
        message(MessageParameters {
            to: data.minter,
            value: afterReserve() - ton("0.2"),
            bounce: false,
            body: Revenue {},
        });
    }

    bounced(msg: bounced<ClaimMessage>) {
        let data: SuccessCallbackData = SuccessCallbackData.fromCell(msg.successCallbackData);
        message(MessageParameters {
            to: self.minterAddress,
            value: afterMessage(),
            bounce: false,
            body: ClaimFailure {
                recipient: data.recipient,
            },
        });
    }
}

message AddMinter { minterAddress: Address }

message Mint {
    recipient: Address;
    spec: ItemSpec;
}

message ClaimFailure {
    recipient: Address;
}

message(0x46326bb3) Revenue {}

struct Void {}

struct SuccessCallbackData {
    minter: Address;
    recipient: Address;
    spec: ItemSpec;
}

inline fun stringLength(string: String): Int {
    return string.asSlice().bits() / 8;
}

inline fun validateDna(cell: Cell): Bool {
    let root: Slice = cell.asSlice();
    if (!isFullSlice(root) || !hasAllRefs(root)) {
        return false;
    }

    let isLeftmostBranch: Bool = true;

    repeat (4) {
        let level1Slice: Slice = root.loadRef().asSlice();
        if (!isFullSlice(level1Slice) || !hasAllRefs(level1Slice)) {
            return false;
        }
        repeat (4) {
            let level2Slice: Slice = level1Slice.loadRef().asSlice();
            if (!isFullSlice(level2Slice)) {
                return false;
            }
            if (isLeftmostBranch) {
                if (level2Slice.refs() != 3) {
                    return false;
                }
                repeat (2) {
                    let level3Slice: Slice = level2Slice.loadRef().asSlice();
                    if (!isFullSlice(level3Slice) || !hasNoRefs(level3Slice)) {
                        return false;
                    }
                }
                let level3Slice3: Slice = level2Slice.loadRef().asSlice();
                if (level3Slice3.bits() != 24 || !hasNoRefs(level3Slice3)) {
                    return false;
                }
                isLeftmostBranch = false;
            } else {
                if (!hasNoRefs(level2Slice)) {
                    return false;
                }
            }
        }
    }

    return true;
}

inline fun isFullSlice(slice: Slice): Bool {
    return slice.bits() == 1023;
}

inline fun hasAllRefs(slice: Slice): Bool {
    return slice.refs() == 4;
}

inline fun hasNoRefs(slice: Slice): Bool {
    return slice.refs() == 0;
}
