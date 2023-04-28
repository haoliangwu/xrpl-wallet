import { createHelia } from "helia";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";
import { createLibp2p } from "libp2p";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webSockets } from "@libp2p/websockets";
import { bootstrap } from "@libp2p/bootstrap";

async function createLibp2pNode({ datastore }: { datastore: MemoryDatastore }) {
  return await createLibp2p({
    datastore,
    transports: [webSockets()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [
      bootstrap({
        list: [
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
        ],
      }),
    ],
  });
}

export async function createHeliaNode() {
  const blockstore = new MemoryBlockstore();
  const datastore = new MemoryDatastore();

  const libp2p = await createLibp2pNode({ datastore });

  // create a Helia node
  return await createHelia({
    datastore,
    blockstore,
    libp2p,
  });
}
