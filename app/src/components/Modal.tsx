import { FC, PropsWithChildren, useMemo, useState } from "react";
import { Modal as TgModal } from "@telegram-apps/telegram-ui";

export class ModalHandle {
  private locked: boolean = false;
  private _setOpen: (open: boolean) => void;

  constructor(
    readonly isOpen: boolean,
    setOpen: (open: boolean) => void
  ) {
    this._setOpen = setOpen;
  }

  setOpen = (open: boolean): void => {
    if (this.locked) return;
    this._setOpen(open);
  };

  open = () => {
    this.setOpen(true);
  };

  setLocked = (locked: boolean) => {
    this.locked = locked;
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
