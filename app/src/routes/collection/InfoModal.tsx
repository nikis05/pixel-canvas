import { Link } from "@/components/Link";
import { Modal, ModalHandle } from "@/components/Modal";
import { Section } from "@/components/Section";
import { List } from "@telegram-apps/telegram-ui";
import { FC } from "react";
import { BsGithub, BsInfoSquare, BsTelegram } from "react-icons/bs";
import { RiFeedbackLine } from "react-icons/ri";

export const InfoModal: FC<{ handle: ModalHandle }> = ({ handle }) => {
  return (
    <Modal srText="Info" handle={handle}>
      <List className="mb-5">
        <Section
          Icon={BsInfoSquare}
          title="About"
          description="This app lets you turn your pixel-arts into NFTs, and trade them with other users. Create an art using the built-in editor, or upload an existing image."
        />
        <Section
          Icon={BsGithub}
          title="Source code"
          description={
            <>
              Source code for the app and contracts can be found on{" "}
              <Link href="https://github.com/nikis05/pixel-canvas">GitHub</Link>
              .
            </>
          }
        />
        <Section
          Icon={RiFeedbackLine}
          title="Feedback"
          description={
            <>
              Contact us using{" "}
              <Link href="https://form.typeform.com/to/v49qmrWE">
                this form
              </Link>
              . Report offensive or illegal NFTs using{" "}
              <Link href="https://form.typeform.com/to/bNJ3Ij42">
                this form
              </Link>
              .
            </>
          }
        />
        <Section
          Icon={BsTelegram}
          title="News & announcements"
          description={
            <>
              Join our{" "}
              <Link href="https://t.me/PixelCanvasNews">Telegram channel</Link>{" "}
              to keep up with our updates
            </>
          }
        />
      </List>
    </Modal>
  );
};
