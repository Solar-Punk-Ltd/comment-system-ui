import { ethers } from "ethers";
import "./App.css";
import { SwarmCommentSystem } from "./components/swarm-comment-system/SwarmCommentSystem";
import { Signer, Utils } from "@ethersphere/bee-js";

function App() {
  const wallet = ethers.Wallet.createRandom();
  const signer: Signer = {
    address: Utils.hexToBytes(wallet.address.slice(2)),
    sign: async (data: any) => {
      return await wallet.signMessage(data);
    },
  };

  return (
    <>
      <SwarmCommentSystem
        stamp={"exampleStamp"}
        topic={"baboytopic"}
        beeApiUrl={"http://localhost:1633"}
        privateKey={"0x7f4e9f4b1b5b2e9b6e0"}
        signer={signer}
      />
    </>
  );
}

export default App;
