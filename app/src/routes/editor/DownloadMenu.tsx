import { Section } from "@/components/Section";
import { useEditor } from "@/model/editor/useEditor";
import { captureException } from "@sentry/react";
import { Button, List, Snackbar, Spinner } from "@telegram-apps/telegram-ui";
import { FC, useCallback, useState } from "react";
import { BsClipboardFill, BsFileArrowDown, BsFileImage } from "react-icons/bs";
import { useIsMounted } from "usehooks-ts";

export const DownloadMenu: FC = () => {
  const isMounted = useIsMounted();
  const { saveToFile, copyDna } = useEditor();

  const [fileDownloading, setFileDownloading] = useState<boolean>(false);

  const onFileDownloadRequested = useCallback(
    (upscale: boolean) => {
      (async () => {
        setFileDownloading(true);
        await saveToFile(upscale);
        if (!isMounted()) return;
        setFileDownloading(false);
      })().catch(captureException);
    },
    [setFileDownloading, saveToFile, isMounted]
  );

  const onFileDownloadRegular = useCallback(
    () => onFileDownloadRequested(false),
    [onFileDownloadRequested]
  );
  const onFileDownloadUpscaled = useCallback(
    () => onFileDownloadRequested(true),
    [onFileDownloadRequested]
  );

  const [dnaCopying, setDnaCopying] = useState<boolean>(false);

  const [dnaCopiedSnackbarOpen, setDnaCopiedSnackbarOpen] =
    useState<boolean>(false);

  const onCopyDna = useCallback(() => {
    (async () => {
      setDnaCopying(true);
      await copyDna();
      if (!isMounted()) return;
      setDnaCopying(false);
      setDnaCopiedSnackbarOpen(true);
    })().catch(captureException);
  }, [setDnaCopying, copyDna, isMounted]);

  const onDnaCopiedSnackbarClosed = useCallback(
    () => setDnaCopiedSnackbarOpen(false),
    [setDnaCopiedSnackbarOpen]
  );

  return (
    <>
      <List className="bg-(--tgui--secondary_color) mb-6">
        <Section
          Icon={BsFileArrowDown}
          title="Save image (regular)"
          description="Save image as a PNG file with real pixel size"
        >
          <div className="mt-4 flex items-center">
            <Button onClick={onFileDownloadRegular}>Save image</Button>
            {fileDownloading && <Spinner size="s" />}
          </div>
        </Section>
        <Section
          Icon={BsFileImage}
          title="Save image (upscaled)"
          description="Save image as a PNG file with increased pixel size"
        >
          <div className="mt-4 flex items-center">
            <Button onClick={onFileDownloadUpscaled}>Save image</Button>
            {fileDownloading && <Spinner size="s" />}
          </div>
        </Section>
        <Section
          Icon={BsClipboardFill}
          title="Copy DNA"
          description="Copy image DNA string to clipboard"
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
