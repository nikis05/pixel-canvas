import "./claim.tact";
import "./item.tact";
import "./safe_transferable.tact";

contract Collection with SafeTransferable {
    owner: Address;

    maxTonkens: Int as uint32;
    imageUrl: String;
    description: String;
    collectionContent: Cell;

    initialized: Bool = false;

    pendingOwnershipTransfer: Address? = null;
    minter: Address?;
    nextItemIndex: Int as uint32 = 0;
    numPendingClaims: Int as uint32 = 0;

    init(maxTokens: Int, imageUrl: String, description: String, collectionContent: Cell) {
        self.owner = sender();
        self.maxTonkens = maxTokens;
        self.imageUrl = imageUrl;
        self.description = description;
        self.collectionContent = collectionContent;
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

    receive(msg: SetMinter) {
        self.requireOwner();
        self.minter = msg.minterAddress;
    }

    receive(msg: SetDisplaySettings) {
        self.requireOwner();
        self.imageUrl = msg.imageUrl;
        self.description = msg.description;
    }

    receive(msg: Mint) {
        let sender: Address = sender();
        require(self.minter == sender, "Not a minter");
        require((self.nextItemIndex + self.numPendingClaims) < self.maxTonkens, "Tokens sold out");
        require(stringLength(msg.itemCreateData.spec.title) <= 32, "Title too long");
        require(stringLength(msg.itemCreateData.spec.artist) <= 32, "Artist too long");
        require(validateDna(msg.itemCreateData.spec.dna), "Invalid DNA");

        let dnaHash: Int = msg.itemCreateData.spec.dna.hash();
        let claimInit: StateInit = initOf Claim(myAddress(), dnaHash);

        self.numPendingClaims += 1;

        send(SendParameters {
            to: contractAddress(claimInit),
            code: codeOf Claim,
            data: claimInit.data,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: ClaimMessage {
                id: msg.id,
                successCallbackAddress: myAddress(),
                successCallbackData: SuccessCallbackData {
                    recipient: msg.recipient,
                    itemCreateData: msg.itemCreateData,
                }.toCell(),
            }.toCell(),
        });
    }

    receive(msg: ClaimSuccess) {
        require(sender() == contractAddress(initOf Claim(myAddress(), msg.subject)), "Wrong sender");
        self.numPendingClaims -= 1;
        let data: SuccessCallbackData = SuccessCallbackData.fromCell(msg.data);
        deploy(DeployParameters {
            init: initOf Item(myAddress(), self.nextItemIndex),
            value: ton("0.2"),
            bounce: false,
            body: Transfer {
                queryId: 0,
                newOwner: data.recipient,
                responseDestination: null,
                customPayload: data.itemCreateData.toCell(),
                forwardAmount: ton("0.05"),
                forwardPayload: emptySlice(),
            }.toCell(),
        });
        self.nextItemIndex += 1;
        message(MessageParameters {
            to: self.minter!!,
            value: afterReserve() - ton("0.2"),
            bounce: false,
            body: SuccessfulMinting {
                id: idFromDna(msg.subject),
            }.toCell(),
        });
    }

    bounced(msg: bounced<ClaimMessage>) {
        self.numPendingClaims -= 1;
        message(MessageParameters {
            to: self.minter!!,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: FailedMinting {
                id: msg.id,
            }.toCell(),
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

    get fun get_nft_content(index: Int, individual_content: Cell): NftContent {
        let titleArtist = TitleArtist.fromCell(individual_content);
        let fullName: StringBuilder = beginString();
        fullName.append("\"");
        fullName.append(titleArtist.title);
        fullName.append("\"");
        fullName.append(" by ");
        fullName.append(titleArtist.artist);

        let image: StringBuilder = beginString();
        image.append(self.imageUrl);
        image.append(index.toString());

        let individualContent: map<Int, Cell> = emptyMap();
        individualContent.set(sha256("name"), fullName.toCell());
        individualContent.set(sha256("description"), self.description.asSlice().asCell());
        individualContent.set(sha256("image"), image.toCell());

        return NftContent {
            firstByte: 0x01,
            dictionary: individualContent,
        };
    }
}

message SetMinter { minterAddress: Address }

message SetDisplaySettings {
    imageUrl: String;
    description: String;
}

message RemoveMinter { minterAddress: Address }

message Mint {
    id: Int as uint224;
    recipient: Address;
    itemCreateData: ItemCreateData;
}

message SuccessfulMinting {
    id: Int as uint224;
}

message FailedMinting {
    id: Int as uint224;
}

struct SuccessCallbackData {
    recipient: Address;
    itemCreateData: ItemCreateData;
}

struct CollectionData {
    nextItemIndex: Int;
    collectionContent: Cell;
    ownerAddress: Address;
}

struct NftContent {
    firstByte: Int as uint8;
    dictionary: map<Int, Cell>;
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

fun idFromDna(dna: Int): Int {
    return dna & (pow2(224) - 1);
}
