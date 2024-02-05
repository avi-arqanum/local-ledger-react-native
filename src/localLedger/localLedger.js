import localBlockchain from "./localBlockchain";
import utxosState from "./utxosState";

import CryptoJS from "crypto-js";
import { ec as EC } from "elliptic";

function generateKeyPair(seedString) {
	const ec = new EC("secp256k1");

	const encoder = new TextEncoder();
	const seed = encoder.encode(seedString);

	const keyPair = ec.keyFromPrivate(seed);

	return keyPair;
}

function createSignature(utxo, seedString) {
	const keyPair = generateKeyPair(seedString);

	const utxoString =
		utxo.transactionId + utxo.outputIndex + utxo.publicKey + utxo.amount;

	const signature = keyPair.sign(utxoString).toDER("hex");

	return signature;
}

function orderUtxos(utxos) {
	if (!utxos || utxos.length === 0) {
		return [];
	}

	return utxos.sort((a, b) => {
		const stringA = `${a.transactionId}${a.outputIndex}${a.amount}${a.publicKey}`;
		const stringB = `${b.transactionId}${b.outputIndex}${b.amount}${b.publicKey}`;
		return stringA.localeCompare(stringB);
	});
}

export default class LocalLedger {
	generateMerkleRoot(hashes) {
		function ensureEven(hashes) {
			if (hashes.length % 2 !== 0) {
				hashes.push(hashes[hashes.length - 1]);
			}
		}
		function hashPair(hash1, hash2) {
			return CryptoJS.SHA256(hash1 + hash2).toString(CryptoJS.enc.Hex);
		}

		if (!hashes || hashes.length === 0) {
			return "";
		}

		ensureEven(hashes);

		const combinedHashes = [];
		for (let i = 0; i < hashes.length; i += 2) {
			const hash = hashPair(hashes[i], hashes[i + 1]);
			combinedHashes.push(hash);
		}

		if (combinedHashes.length === 1) {
			return combinedHashes.join("");
		}

		return this.generateMerkleRoot(combinedHashes);
	}

	calculateMerkleRoot(inputUtxos, outputUtxos) {
		function hashUtxo(utxo) {
			const utxoString = `${utxo.transactionId}${utxo.outputIndex}${utxo.amount}${utxo.publicKey}`;
			return CryptoJS.SHA256(utxoString).toString(CryptoJS.enc.Hex);
		}

		const utxos = orderUtxos([...inputUtxos, ...outputUtxos]);
		const hashes = utxos.map((utxo) => hashUtxo(utxo));

		return this.generateMerkleRoot(hashes);
	}

	calculateBlockHash({
		blockId,
		timestamp,
		transactionId,
		utxosMerkleRoot,
		prevBlockHash,
	}) {
		var hashString = `${blockId}${timestamp}${transactionId}${utxosMerkleRoot}${prevBlockHash}`;

		return CryptoJS.SHA256(hashString).toString(CryptoJS.enc.Hex);
	}

	createGenesisBlock() {
		const genesisBlock = {
			blockId: 0,
			timestamp: Date.now(),
			transactionId: "genesis-block-creation",
			prevBlockHash: null,
		};

		genesisBlock[utxosMerkleRoot] = this.calculateMerkleRoot([], []);
		genesisBlock[blockHash] = this.calculateBlockHash(genesisBlock);

		this.localBlockchainDB.insertBlock(genesisBlock);

		return genesisBlock;
	}

	static instance = null;
	constructor() {
		if (!instance) {
			this.localBlockchainDB = new localBlockchain();
			this.utxosStateDB = new utxosState();

			this.timeOrderedUtxos = [];
			this.latestBlock = this.createGenesisBlock();

			LocalLedger.instance = this;
		}

		return LocalLedger.instance;
	}

	printBlockchain() {
		const blockChain = this.localBlockchainDB.getAllBlocksInOrder();
		blockChain.forEach((block) => console.log(block));
	}

	generateTransaction(userPublicKey, recipientPublicKey, spendingAmount) {
		var totalAmount = 0;
		const selectedUtxos = [];

		for (
			let i = this.timeOrderedUtxos.length - 1;
			i >= 0 && totalAmount < spendingAmount;
			i--
		) {
			totalAmount += this.timeOrderedUtxos[i].amount;
			selectedUtxos.push(this.timeOrderedUtxos[i]);
		}

		if (totalAmount < spendingAmount) {
			console.log("You don't have enough balance!");
			return;
		}

		const transactionData = {
			inputUtxos: selectedUtxos,
			outputUtxos: [
				{
					publicKey: recipientPublicKey,
					amount: spendingAmount,
				},
				{
					publicKey: userPublicKey,
					amount: totalAmount - spendingAmount,
				},
			],
		};

		transactionData.digitalSignatures = transactionData.inputUtxos.map(
			(utxo) => createSignature(utxo, "5")
		);

		return transactionData;
	}

	addTransactionBlock(transactionData) {
		const { transactionId, inputUtxos, outputUtxos } = transactionData;

		const block = {
			blockId: this.latestBlock.blockId + 1,
			timestamp: new Date(),
			transactionId: transactionId,
			prevBlockHash: this.latestBlock.blockHash,
			utxosMerkleRoot: this.calculateMerkleRoot(inputUtxos, outputUtxos),
		};

		block[blockHash] = this.calculateBlockHash(block);

		this.localBlockchainDB.insertBlock(block);
		this.localBlockchainDB.insertBlockContent(
			transactionData,
			block.blockId
		);

		console.log("blockchain updated");

		this.latestBlock = block;

		for (let utxo of inputUtxos) {
			this.utxosStateDB.deleteUTXO(utxo);
		}

		for (let utxo of outputUtxos) {
			this.utxosStateDB.addUTXO(utxo);
		}

		console.log("utxos state db updated!");

		const indices = inputUtxos.map(({ transactionId, outputIndex }) => {
			return this.timeOrderedUtxos.findIndex(
				(utxo) =>
					utxo.transactionId === transactionId &&
					utxo.outputIndex === outputIndex
			);
		});

		const minIndex = Math.min(...indices);

		this.timeOrderedUtxos.splice(minIndex, inputUtxos.length);

		console.log("time ordered utxos array updated");
	}
}
