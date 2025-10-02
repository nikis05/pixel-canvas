import { Modal, ModalHandle } from "@/components/Modal";
import { Section } from "@/components/Section";
import { WithSwr } from "@/components/WithSwr";
import { API_URL } from "@/index";
import React, { FC } from "react";
import useSWR from "swr";
import { fromNano } from "@ton/core";

export const BakeModal: FC<{ handle: ModalHandle }> = ({ handle }) => {
  const itemPrice = useSWR("item_price", () =>
    fetch(`${API_URL}/item_price`)
      .then((resp) => resp.text())
      .then((text) => parseInt(text, 10))
  );

  return (
    <Modal handle={handle} srText="Bake NFT">
      <WithSwr swr={itemPrice} render={renderModalContent} />
    </Modal>
  );
};

function renderSectionIcon(): React.ReactNode {
  return (
    <div className="h-8 w-8 rounded-sm bg-white flex justify-center items-center text-white"></div>
  );
}

function renderModalContent(data: number | null): React.ReactNode {
  return (
    <Section
      renderIcon={renderSectionIcon}
      title="Create your NFT"
      description={
        <>
          <div>Make a unique NFT with your pixel-art</div>
          <div>Current service fee: {data ? fromNano(data) : ""}</div>
        </>
      }
    />
  );
}
