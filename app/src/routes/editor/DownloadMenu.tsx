import { Section } from "@/components/Section";
import { useEditor } from "@/model/editor/useEditor";
import { toVoid } from "@/utils/toVoid";
import { Button, List, Snackbar, Spinner } from "@telegram-apps/telegram-ui";
import { FC, useCallback, useState } from "react";
import { BsClipboardFill, BsFileArrowDown } from "react-icons/bs";
import { useIsMounted } from "usehooks-ts";

export const DownloadMenu: FC = () => {
  const isMounted = useIsMounted();
  const { saveToFile, copyDna } = useEditor();

  const [fileDownloading, setFileDownloading] = useState<boolean>(false);

  const onFileDownloadRequested = useCallback(
    toVoid(async () => {
      setFileDownloading(true);
      await saveToFile(false);
      if (!isMounted()) return;
      setFileDownloading(false);
    }),
    [setFileDownloading, saveToFile, isMounted]
  );

  const [dnaCopying, setDnaCopying] = useState<boolean>(false);

  const [dnaCopiedSnackbarOpen, setDnaCopiedSnackbarOpen] =
    useState<boolean>(false);

  const onCopyDna = useCallback(
    toVoid(async () => {
      setDnaCopying(true);
      await copyDna();
      if (!isMounted()) return;
      setDnaCopying(false);
      setDnaCopiedSnackbarOpen(true);
    }),
    [setDnaCopying, copyDna, isMounted]
  );

  const onDnaCopiedSnackbarClosed = useCallback(
    () => setDnaCopiedSnackbarOpen(false),
    [setDnaCopiedSnackbarOpen]
  );

  return (
    <>
      <List className="bg-(--tgui--secondary_color) mb-6">
        <Section
          Icon={BsFileArrowDown}
          title="Save image"
          description="Save image as a PNG file"
        >
          <div className="mt-4 flex items-center">
            <Button onClick={onFileDownloadRequested}>Save image</Button>
            {fileDownloading && <Spinner size="s" />}
          </div>
        </Section>
        <Section
          Icon={BsClipboardFill}
          title="Copy DNA"
          description="Enter image DNA string"
        >
          <div className="mt-4 flex items-center">
            <Button onClick={onCopyDna}>Copy DNA</Button>
            {dnaCopying && <Spinner size="s" />}
          </div>
        </Section>
      </List>
      {dnaCopiedSnackbarOpen && (
        <Snackbar
          className="z-4"
          duration={3000}
          onClose={onDnaCopiedSnackbarClosed}
          description="DNA string successfully copied to clipboard"
        >
          DNA string copied
        </Snackbar>
      )}
    </>
  );
};
