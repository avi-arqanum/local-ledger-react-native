import SQlite from "react-native-sqlite-storage";
import CryptoJS from "crypto-js";
import { LevelDB } from "react-native-leveldb";
import { RBTree } from "bintrees";

import uuid from "react-native-uuid";

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

class localBlockchain {
	createTables() {
		this.Db.transaction((tx) => {
			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS Blocks (
                block_id INTEGER PRIMARY KEY,
                timestamp INTEGER,
                transaction_id TEXT,
                prev_block_hash TEXT,
                utxos_merkle_root TEXT,
                block_hash TEXT
              );`,
				[],
				() => {
					console.log("Created Blocks Table");
				}
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS UTXOs (
              utxo_id TEXT PRIMARY KEY,
              transaction_id TEXT,
              output_index INTEGER,
              amount INTEGER,
              public_key TEXT,
              utxo_type TEXT CHECK( utxo_type IN ('output', 'input') )
            );`,
				[],
				() => {
					console.log("Created UTXOs Table");
				}
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS BlocksContent (
              block_id TEXT,
              utxo_id TEXT,
              PRIMARY KEY (block_id, utxo_id),
              FOREIGN KEY (block_id) REFERENCES Blocks(block_id),
              FOREIGN KEY (utxo_id) REFERENCES UTXOs(utxo_id)
            );`,
				[],
				() => {
					console.log("Created BlocksContent Table");
				}
			);
		});
	}

	constructor() {
		this.Db = SQlite.openDatabase(
			{
				name: "localBlockchainDB",
			},
			() => console.log("local blockchain database opened!")
		);

		this.createTables();
	}

	insertBlock(block) {
		Db.transaction((tx) => {
			tx.executeSql(
				"INSERT INTO Blocks (block_id, timestamp, transaction_id, prev_block_hash, utxos_merkle_root, block_hash) VALUES (?, ?, ?, ?, ?, ?)",
				[
					block.blockId,
					block.timestamp,
					block.transactionId,
					block.prevBlockHash,
					block.utxosMerkleRoot,
					block.blockHash,
				],
				() => {
					console.log("Block inserted");
				},
				(error) => {
					console.log("Error inserting block: ", error);
				}
			);
		});
	}

	insertBlockContent(transaction, blockId) {
		const { transactionId, inputUtxos, outputUtxos } = transaction;

		Db.transaction((tx) => {
			inputUtxos.forEach((utxo) => {
				const utxo_id = uuid.v4();
				tx.executeSql(
					"INSERT INTO UTXOs (utxo_id, transaction_id, output_index, amount, public_key, utxo_type) VALUES (?, ?, ?, ?, ?, ?)",
					[
						utxo_id,
						utxo.transactionId,
						utxo.outputIndex,
						utxo.amount,
						utxo.publicKey,
						"input",
					],
					() => {
						console.log("Input UTXO inserted");
					}
				);

				tx.executeSql(
					"INSERT INTO BlocksContent (block_id,utxo_id) VALUES (?, ?)",
					[blockId, utxo_id],
					() => {
						console.log("Input UTXO inserted into Blocks content");
					}
				);
			});

			outputUtxos.forEach((utxo) => {
				const utxo_id = uuid.v4();
				tx.executeSql(
					"INSERT INTO UTXOs (utxo_id, transaction_id, output_index, amount, public_key, utxo_type) VALUES (?, ?, ?, ?, ?, ?)",
					[
						utxo_id,
						utxo.transactionId,
						utxo.outputIndex,
						utxo.amount,
						utxo.publicKey,
						"output",
					],
					() => {
						console.log("Output UTXO inserted");
					}
				);

				tx.executeSql(
					"INSERT INTO BlocksContent (block_id,utxo_id) VALUES (?, ?)",
					[blockId, utxo_id],
					() => {
						console.log("UTXO inserted into Blocks content");
					}
				);
			});
		});
	}
}

class utxosState {
	constructor() {
		this.Db = new LevelDB("utxosStateDB", true, false);
	}

	getUTXO(transactionId, outputIndex) {
		const key = `${transactionId}:${outputIndex}`;
		try {
			const value = this.Db.getStr(key);
			return value.split(",");
		} catch (error) {
			console.error("Error retrieving UTXO:", error);
			return null;
		}
	}

	addUTXO(utxo) {
		const { transactionId, outputIndex, amount, publicKey } = utxo;

		const key = `${transactionId}:${outputIndex}`;
		const value = `${amount},${publicKey}`;

		try {
			this.Db.put(key, value);
		} catch (error) {
			console.error("Error adding UTXO:", error);
		}
	}

	deleteUTXO(utxo) {
		const { transactionId, outputIndex } = utxo;

		const key = `${transactionId}:${outputIndex}`;
		try {
			this.Db.del(key);
		} catch (error) {
			console.error("Error deleting UTXO:", error);
		}
	}
}

class balancedBST {
	constructor() {
		this.tree = new RBTree((a, b) => a.amount - b.amount);
	}

	maxUtxoAmount() {
		return this.tree.max();
	}

	lowerBound(amount) {
		return this.tree.lowerBound(amount);
	}

	upperBound(amount) {
		return this.tree.upperBound(amount);
	}

	searchValue(amount) {
		return this.tree.find(amount) || {};
	}

	addUtxo(amount, utxoKey) {
		let value = this.searchValue(amount);

		if (value) {
			value.utxoKeys.push(utxoKey);
		} else {
			this.tree.insert({ amount: amount, utxoKeys: [utxoKey] });
		}
	}

	deleteUtxo(amount, utxoKey) {
		let value = this.searchValue(amount);

		if (value) {
			const index = value.utxoKeys.findIndex(utxoKey);
			if (index > -1) {
				utxos.splice(index, 1);
				if (utxos.length === 0) {
					this.tree.remove(amount);
				}
			}
		}
	}
}

class LocalLedger {
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

			this.balancedBST = new balancedBST();
			this.latestBlock = this.createGenesisBlock();

			LocalLedger.instance = this;
		}

		return LocalLedger.instance;
	}

	generateTransaction(recipientPublicKey, spendingAmount) {
		var totalAmount = 0;
		const selectedUtxos = [];

		if (this.balancedBST.maxUtxoAmount < spendingAmount) {
			var spentAmount = spendingAmount;
			while (totalAmount < spendingAmount) {
				const upperBoundValue =
					this.balancedBST.upperBound(spentAmount);
				const utxoKeys = upperBoundValue.utxoKeys;

				for (
					let i = utxoKeys.length - 1;
					i >= 0 && totalAmount < spendingAmount;
					i--
				) {
					totalAmount += upperBoundValue.amount;
					selectedUtxos.push(utxoKeys[i]);
					utxoKeys.pop();
				}

				spentAmount = upperBoundValue.amount - 1;
			}
		} else {
			const lowerBoundValue = this.balancedBST.lowerBound(spendingAmount);

			const utxoKey = lowerBoundValue.utxoKeys.pop;
			totalAmount += lowerBoundValue.amount;

			selectedUtxos.push(this.utxosStateDB.getUTXO(utxoKey));
		}
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
	}
}
