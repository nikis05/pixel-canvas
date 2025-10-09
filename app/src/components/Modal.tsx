import { FC, PropsWithChildren, useMemo, useState } from "react";
import { Modal as TgModal } from "@telegram-apps/telegram-ui";

export class ModalHandle {
  constructor(
    readonly isOpen: boolean,
    readonly setOpen: (open: boolean) => void
  ) {}

  open = () => {
    this.setOpen(true);
  };
}

export const useModal = (): ModalHandle => {
  const [open, setOpen] = useState<boolean>(false);
  const state = useMemo(() => new ModalHandle(open, setOpen), [open, setOpen]);
  return state;
};

export const Modal: FC<
  PropsWithChildren<{ handle: ModalHandle; srText: string }>
> = ({ handle, srText, children }) => {
  return (
    <TgModal
      open={handle.isOpen}
      header={
        <TgModal.Header>
          <span className="sr-only">{srText}</span>
        </TgModal.Header>
      }
      onOpenChange={handle.setOpen}
    >
      <div className="flex flex-col items-center">{children}</div>
    </TgModal>
  );
};
