import { Section } from "@/components/Section";
import { LoadFromFileStatus } from "@/model/editor";
import { useEditor } from "@/model/editor/useEditor";
import unreachable from "@/utils/unreachable";
import {
  Button,
  FileInput,
  Input,
  List,
  Snackbar,
  Spinner,
} from "@telegram-apps/telegram-ui";
import { ChangeEvent, FC, useCallback, useState } from "react";
import { BsClipboard, BsFileArrowUp } from "react-icons/bs";
import { useIsMounted } from "usehooks-ts";
import { confirmReplace } from "./replaceAlert";

export const UploadMenu: FC = () => {
  const { loadFromFile, loadFromDna, isEmpty } = useEditor();
  const isMounted = useIsMounted();

  const [fileUploading, setFileUploading] = useState<boolean>(false);
  const [fileUploadStatus, setFileUploadStatus] =
    useState<LoadFromFileStatus | null>(null);
  const onFileUploadSnackbarClose = useCallback(
    () => setFileUploadStatus(null),
    [setFileUploadStatus]
  );

  const onFileSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!(await confirmReplace(isEmpty))) return;
      const file = e.target.files?.[0];
      if (!file) return;
      setFileUploading(true);
      const status = await loadFromFile(file);
      if (!isMounted()) return;
      setFileUploading(false);
      setFileUploadStatus(status);
    },
    [confirmReplace, setFileUploading, loadFromFile, isMounted]
  );

  const [dna, setDna] = useState<string>("");

  const onDnaPaste = useCallback(async () => {
    const dna = await navigator.clipboard.readText();
    setDna(dna);
  }, [navigator, setDna]);

  const onDnaChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setDna(e.target.value);
    },
    [setDna]
  );

  const [loadingFromDna, setLoadingFromDna] = useState<boolean>(false);
  const [loadFromDnaResult, setLoadFromDnaResult] = useState<boolean | null>(
    null
  );

  const onLoadFromDna = useCallback(async () => {
    if (!(await confirmReplace(isEmpty))) return;
    setLoadingFromDna(true);
    const result = await loadFromDna(dna);
    if (!isMounted()) return;
    setLoadingFromDna(false);
    setLoadFromDnaResult(result);
  }, [loadFromDna, dna, isMounted, setLoadFromDnaResult]);

  const onLoadFromDnaSnackbarClose = useCallback(() => {
    setLoadFromDnaResult(null);
  }, [
    confirmReplace,
    setLoadingFromDna,
    loadFromDna,
    isMounted,
    setLoadFromDnaResult,
  ]);

  return (
    <>
      <List className="bg-(--tgui--secondary_color) mb-6">
        <Section
          Icon={BsFileArrowUp}
          title="Upload file"
          description={
            <>
              Upload a file from your device. Supported formats: png, jpg, bmp.
              Note: the file must be exactly 64x64 pixels, and only
              contain&nbsp;
              <a
                className="text-(--tgui--link_color)"
                href="https://nikis05.github.io/pixel-canvas/palette.json"
              >
                allowed colors
              </a>
              .
            </>
          }
        >
          <div className="flex items-center">
            <FileInput
              className="relative -left-6 w-45"
              accept=".png,.jpg,.jpeg,.bmp"
              onChange={onFileSelected}
              disabled={fileUploading}
            />
            {fileUploading && <Spinner size="s" />}
          </div>
        </Section>
        <Section
          Icon={BsClipboard}
          title="Enter DNA"
          description="Enter image DNA string"
        >
          <div className="relative -left-6">
            <div className="flex items-center">
              <Input
                placeholder="Image DNA"
                value={dna}
                onChange={onDnaChange}
              />
              <Button size="s" onClick={onDnaPaste}>
                Paste
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Button onClick={onLoadFromDna}>Load from DNA</Button>
            {loadingFromDna && <Spinner size="s" />}
          </div>
        </Section>
      </List>
      {fileUploadStatus != null && (
        <Snackbar
          className="z-4"
          duration={3000}
          onClose={onFileUploadSnackbarClose}
          description={
            fileUploadStatus == "ok" ? (
              "The image has been added to the editor"
            ) : fileUploadStatus == "decode_error" ? (
              "The file is correpted, or of unsupported encoding"
            ) : fileUploadStatus == "unsupported_extension" ? (
              "File extension is not supported - please use PNG, Jpeg, or BMP"
            ) : fileUploadStatus == "wrong_dimensions" ? (
              "Please ensure that the image size is exactly 64x64px"
            ) : fileUploadStatus == "wrong_palette" ? (
              <>
                Please ensure that the image only contains{" "}
                <a href="https://nikis05.github.io/pixel-canvas/palette.json">
                  allowed colos
                </a>
              </>
            ) : (
              unreachable(fileUploadStatus)
            )
          }
        >
          {fileUploadStatus == "ok"
            ? "File opened successfuly"
            : "Error opening file"}
        </Snackbar>
      )}
      {loadFromDnaResult !== null && (
        <Snackbar
          className="z-4"
          duration={3000}
          onClose={onLoadFromDnaSnackbarClose}
          description={
            loadFromDnaResult === true
              ? "Successfully loaded the image from DNA"
              : "Invalid DNA string"
          }
        >
          {loadFromDnaResult === true ? "Success" : "Invalid DNA"}
        </Snackbar>
      )}
    </>
  );
};
