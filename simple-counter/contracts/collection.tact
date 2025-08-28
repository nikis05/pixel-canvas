import "./claim.tact";
import "./item.tact";
import "./safe_transferable.tact";
import "./utils.tact";

contract Collection(
    owner: Address,
    imageUrl: String,
    collectionContent: Cell,
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
        require(stringLength(msg.title) <= 60, "Title too long");
        require(stringLength(msg.artist) <= 60, "Artist too long");
        require(validateDna(msg.data), "Invalid DNA");

        let dnaHash: String = msg.spec.toCell().hash();
        send(SendParameters {
            to: contractAddress(initOf Claim(myAddress(), dnaHash)),
            code: codeOf Claim,
            data: dnaHash,
            value: 0,
            mode: SendRemainingValue,
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
                queryId: 0,
                newOwner: data.recipient,
                responseDestination: null,
                customPayload: data.itemData.toCell(),
                forwardAmount: ton("0.05"),
                forwardPayload: emptySlice(),
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
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: ClaimFailure {
                recipient: data.recipient,
            },
        });
    }

    receive(msg: RefreshItemImageUrl) {
        message(MessageParameters {
            to: contractAddress(initOf Item(myAddress(), msg.itemIndex)),
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: RefreshImageUrl {
                newUrl: self.imageUrl,
            },
        });
    }

    get fun get_collection_data(): CollectionData {
        return CollectionData {
            nextItemIndex: self.nextItemIndex,
            collectionContent: self.collectionContent,
            ownerAddress: self.owner,
        };
    }

    get fun get_nft_address_by_index(item_index: Int): Address {
        return contractAddress(initOf Item(myAddress(), item_index));
    }

    get fun get_nft_content(index: Int, individual_content: Cell) {
        let fullName: StringBuilder = beginString();
        fullName.append("\"");
        fullName.append(self.spec.title);
        fullName.append("\"");
        fullName.append(" by ");
        fullName.append(self.spec.artist);

        let image: StringBuilder = beginString();
        image.append(self.imageUrl);
        image.append(index);

        let individualContent: map<Int, String> = emptyMap();
        individualContent.insert(sha256("name"), fullName.toString());
        individualContent.insert(sha256("description"), DESCRIPTION);
        individualContent.insert(sha256("image"), image.toString());

        return NftContent {
            firstByte: 0x01,
            dictionary: individualContent,
        };
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

message RefreshItemImageUrl { itemIndex: Int }

struct Void {}

struct SuccessCallbackData {
    minter: Address;
    recipient: Address;
    spec: ItemSpec;
}

struct CollectionData {
    nextItemIndex: Int;
    collectionContent: Cell;
    ownerAddress: Address;
}

struct NftContent {
    firstByte: Int as u8;
    dictionary: map<Int, String>;
}

inline fun afterReserve(): Int {
    let msgValue: Int = context().value;
    let balanceBeforeMsg: Int = myBalance() - msgValue;
    let coinsNeeded: Int = max(ton("0.1") - balanceBeforeMsg, 0);
    let amount: Int = msgValue - coinsNeeded;
    return amount;
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
