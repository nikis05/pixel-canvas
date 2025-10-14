import { FC, useCallback, useEffect } from "react";
import { Modal, ModalHandle } from "./Modal";
import { ACCEPTED_TOS_VERSION, TOS_STORAGE_KEY, TOS_VERSION } from "..";
import { Section } from "./Section";
import { BsFileText } from "react-icons/bs";
import { Link } from "./Link";
import { Button } from "@telegram-apps/telegram-ui";
import { setCloudStorageItem } from "@telegram-apps/sdk-react";
import { captureException } from "@sentry/react";

export const TosModal: FC<{ handle: ModalHandle }> = ({ handle }) => {
  useEffect(() => {
    if (ACCEPTED_TOS_VERSION == TOS_VERSION || ACCEPTED_TOS_VERSION === null)
      return;
    handle.open();
    handle.setLocked(true);
  }, [handle]);

  const onButtonClick = useCallback(() => {
    if (import.meta.env.DEV) {
      localStorage.setItem(TOS_STORAGE_KEY, TOS_VERSION);
    }
    if (setCloudStorageItem.isAvailable()) {
      setCloudStorageItem(TOS_STORAGE_KEY, TOS_VERSION).catch(captureException);
    }
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
