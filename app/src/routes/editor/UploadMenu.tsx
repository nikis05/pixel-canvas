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
import { ChangeEvent, FC, useCallback, useRef, useState } from "react";
import { BsClipboard, BsFileArrowUp } from "react-icons/bs";
import { useIsMounted } from "usehooks-ts";
import { confirmReplace } from "./replaceAlert";
import { toVoid } from "@/utils/toVoid";
import { Link } from "@/components/Link";

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
    toVoid(async (e: ChangeEvent<HTMLInputElement>) => {
      if (!(await confirmReplace(isEmpty))) return;
      const file = e.target.files?.[0];
      if (!file) return;
      setFileUploading(true);
      const status = await loadFromFile(file);
      if (!isMounted()) return;
      setFileUploading(false);
      setFileUploadStatus(status);
    }),
    [confirmReplace, setFileUploading, loadFromFile, isMounted]
  );

  const dna = useRef<string>("");

  const onDnaChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      dna.current = e.target.value;
    },
    [dna]
  );

  const [loadingFromDna, setLoadingFromDna] = useState<boolean>(false);
  const [loadFromDnaResult, setLoadFromDnaResult] = useState<boolean | null>(
    null
  );

  const onLoadFromDna = useCallback(
    toVoid(async () => {
      if (!(await confirmReplace(isEmpty))) return;
      setLoadingFromDna(true);
      const result = await loadFromDna(dna.current);
      if (!isMounted()) return;
      setLoadingFromDna(false);
      setLoadFromDnaResult(result);
    }),
    [loadFromDna, dna, isMounted, setLoadFromDnaResult]
  );

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
              <Link href="https://nikis05.github.io/pixel-canvas/palette.json">
                allowed colors
              </Link>
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
          <div className="*:p-0! *:pt-4! *:pb-4!">
            <Input placeholder="Image DNA" onChange={onDnaChange} />
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
                <Link href="https://nikis05.github.io/pixel-canvas/palette.json">
                  allowed colos
                </Link>
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
