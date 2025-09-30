import "./claim.tact";
import "./item.tact";
import "./safe_transferable.tact";
import "@stdlib/stoppable";

contract Collection with SafeTransferable, Resumable {
    owner: Address;
    stopped: Bool = true;

    maxTonkens: Int as uint32;
    imageUrl: String;
    collectionContent: Cell;

    initialized: Bool = false;

    pendingOwnershipTransfer: Address? = null;
    minter: Address?;
    resaleReporter: Address?;
    nextItemIndex: Int as uint32 = 0;
    numPendingClaims: Int as uint32 = 0;
    numPendingReports: Int as uint32 = 0;

    init(maxTokens: Int, imageUrl: String, collectionContent: Cell) {
        self.owner = sender();
        self.maxTonkens = maxTokens;
        self.imageUrl = imageUrl;
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

    receive(msg: SetDisplaySettings) {
        self.requireOwner();
        self.imageUrl = msg.imageUrl;
        self.collectionContent = msg.collectionContent;
        cashback(sender());
    }

    receive(msg: SetMinter) {
        self.requireOwner();
        self.requireStopped();
        require(self.numPendingClaims == 0, "There are pending requests");
        self.minter = msg.minterAddress;
        cashback(sender());
    }

    receive(msg: SetResaleReporter) {
        self.requireOwner();
        self.requireStopped();
        require(self.numPendingReports == 0, "There are pending requests");
        self.resaleReporter = msg.resaleReporterAddress;
        cashback(sender());
    }

    receive(msg: Mint) {
        self.requireNotStopped();
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
                    forwardPayloadCustom: msg.forwardPayloadCustom,
                }.toCell(),
            }.toCell(),
        });
    }

    receive(msg: ClaimSuccess) {
        require(sender() == contractAddress(initOf Claim(myAddress(), msg.subject)), "Wrong sender");
        self.numPendingClaims -= 1;
        let data: SuccessCallbackData = SuccessCallbackData.fromCell(msg.data);
        let itemIndex: Int = self.nextItemIndex;
        deploy(DeployParameters {
            init: initOf Item(myAddress(), itemIndex),
            value: ton("0.1"),
            bounce: false,
            body: Transfer {
                queryId: 0,
                newOwner: data.recipient,
                responseDestination: null,
                customPayload: data.itemCreateData.toCell(),
                forwardAmount: ton("0.05"),
                forwardPayload: MintForwardPayload {
                    itemIndex,
                    custom: data.forwardPayloadCustom,
                }.toSlice(),
            }.toCell(),
        });
        self.nextItemIndex += 1;
        message(MessageParameters {
            to: self.minter!!,
            value: afterReserve() - ton("0.1"),
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

    receive(msg: ReportResale) {
        self.requireNotStopped();
        let sender: Address = sender();
        require(sender == self.resaleReporter, "Not a resale reporter");
        self.numPendingReports += 1;
        message(MessageParameters {
            to: contractAddress(initOf Item(myAddress(), msg.itemIndex)),
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: ReportItemResale {
                id: msg.id,
                resaleValue: msg.resaleValue,
            }.toCell(),
        });
    }

    receive(msg: ReportResaleCallback) {
        self.numPendingReports -= 1;
        message(MessageParameters {
            to: self.resaleReporter!!,
            value: 0,
            mode: SendRemainingValue,
            bounce: false,
            body: msg.toCell(),
        });
    }

    bounced(msg: bounced<ReportItemResale>) {
        self.numPendingReports -= 1;
        message(MessageParameters {
            to: self.resaleReporter!!,
            value: 0,
            mode: SendRemainingValue,
            bounce: true,
            body: ReportResaleCallback {
                id: msg.id,
            }.toCell(),
        });
    }

    bounced(msg: Slice) {}

    get fun get_collection_data(): CollectionData {
        return CollectionData {
            nextItemIndex: self.nextItemIndex,
            collectionContent: self.collectionContent,
            ownerAddress: self.owner.asSlice(),
        };
    }

    get fun get_nft_address_by_index(item_index: Int): Slice {
        return contractAddress(initOf Item(myAddress(), item_index)).asSlice();
    }

    get fun get_nft_content(index: Int, individual_content: Cell): Cell {
        let individualContent = IndividualContent.fromCell(individual_content);
        let fullName: Cell = beginTailString()
            .concat("\"")
            .concat(individualContent.title)
            .concat("\"")
            .concat(" by ")
            .concat(individualContent.artist)
            .toCell();

        let description: Cell = beginTailString()
            .concat("Artist fingerprint: ")
            .concat(toHex(individualContent.artistFingerprint >> (256 - 32), 8))
            .concat("\n")
            .concat("Last sold for: ")
            .concat(individualContent.lastResaleValue != null ? individualContent.lastResaleValue!!.toCoinsString() : "0")
            .concat("ton")
            .toCell();

        let image: Cell = beginTailString()
            .concat(self.imageUrl)
            .concat(index.toString())
            .toCell();

        let nftContent: map<Int as uint256, Cell> = emptyMap();
        nftContent.set(sha256("name"), fullName);
        nftContent.set(sha256("description"), description);
        nftContent.set(sha256("image"), image);

        return beginCell()
            .storeUint(0x00, 8)
            .storeMaybeRef(nftContent.asCell())
            .endCell();
    }
}

message(0x6f421bc6) SetMinter { minterAddress: Address? }

message(0x253e7e97) SetResaleReporter { resaleReporterAddress: Address? }

message(0x9f6eefc2) SetDisplaySettings {
    imageUrl: String;
    collectionContent: Cell;
}

message(0xed880a53) Mint {
    id: Int as uint224;
    recipient: Address;
    itemCreateData: ItemCreateData;
    forwardPayloadCustom: Cell;
}

message(0xc31853c0) SuccessfulMinting {
    id: Int as uint224;
}

message(0xdbe55a98) FailedMinting {
    id: Int as uint224;
}

message(0xb35c07b) ReportResale {
    id: Int as uint224;
    itemIndex: Int as uint32;
    resaleValue: Int;
}

struct SuccessCallbackData {
    recipient: Address;
    itemCreateData: ItemCreateData;
    forwardPayloadCustom: Cell;
}

struct MintForwardPayload {
    itemIndex: Int as uint32;
    custom: Cell;
}

struct CollectionData {
    nextItemIndex: Int;
    collectionContent: Cell;
    ownerAddress: Slice;
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
                if (!hasAllRefs(level2Slice)) {
                    return false;
                }
                repeat (3) {
                    let level3Slice: Slice = level2Slice.loadRef().asSlice();
                    if (!isFullSlice(level3Slice) || !hasNoRefs(level3Slice)) {
                        return false;
                    }
                }
                let level3Slice4: Slice = level2Slice.loadRef().asSlice();
                if (level3Slice4.bits() != 24 || !hasNoRefs(level3Slice4)) {
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

inline fun idFromDna(dna: Int): Int {
    return dna & (pow2(224) - 1);
}

inline fun toHex(x: Int, length: Int): String {
    let result: StringBuilder = beginString();

    let i: Int = length - 1;
    repeat (length) {
        let nibble: Int = (x >> (i * 4)) & 0xf;
        let ch = hexForBits(nibble);
        result.append(ch);
        i -= 1;
    }

    return result.toString();
}

inline fun hexForBits(bits: Int): String {
    if (bits < 10) {
        return bits.toString();
    } else if (bits == 10) {
        return "a";
    } else if (bits == 11) {
        return "b";
    } else if (bits == 12) {
        return "c";
    } else if (bits == 13) {
        return "d";
    } else if (bits == 14) {
        return "e";
    } else {
        return "f";
    }
}
