import { FC, useCallback, useEffect } from "react";
import { Modal, useModal } from "./Modal";
import { Section } from "./Section";
import { BsFileText } from "react-icons/bs";
import { Link } from "./Link";
import { Button } from "@telegram-apps/telegram-ui";
import { TOS_STORAGE_KEY } from "@/App";
import { trySetDeviceStorageKey } from "@/utils/deviceStorage";

const TOS_VERSION = "1";

export type TosModalProps = {
  acceptedTosVersion:
    | { available: false }
    | { available: true; version: string | null };
};

export const TosModal: FC<TosModalProps> = ({ acceptedTosVersion }) => {
  const handle = useModal();

  useEffect(() => {
    if (
      !acceptedTosVersion.available ||
      acceptedTosVersion.version == TOS_VERSION
    )
      return;
    handle.setOpen(true);
    handle.setLocked(true);
  }, [acceptedTosVersion, handle]);

  const onButtonClick = useCallback(() => {
    if (import.meta.env.DEV) {
      localStorage.setItem(TOS_STORAGE_KEY, TOS_VERSION);
    }

    trySetDeviceStorageKey(TOS_STORAGE_KEY, TOS_VERSION);

    handle.setLocked(false);
    handle.setOpen(false);
  }, [handle]);

  return (
    <Modal handle={handle} srText="Terms of Service">
      <Section
        Icon={BsFileText}
        title="Terms of Service"
        description={
          <div className="mb-5">
            By continuing to use this application, you confirm that you've read
            and accepted our{" "}
            <Link href="https://nikis05.github.io/pixel-canvas/tos.txt">
              Terms of Service
            </Link>{" "}
            and
            <Link href="https://nikis05.github.io/pixel-canvas/privacy.txt">
              Privacy policy
            </Link>
          </div>
        }
      >
        <Button className="mb-5" onClick={onButtonClick}>
          I accept
        </Button>
      </Section>
    </Modal>
  );
};
