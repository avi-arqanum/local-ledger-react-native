import SQlite from "react-native-sqlite-storage";
import uuid from "react-native-uuid";

export default class localBlockchain {
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

	getAllBlocksInOrder() {
		this.Db.transaction((tx) => {
			tx.executeSql(
				"SELECT * FROM Blocks ORDER BY block_id ASC;",
				[],
				(_, result) => {
					let blocks = [];
					for (let i = 0; i < result.rows.length; i++) {
						blocks.push(result.rows.item(i));
					}

					return blocks;
				},
				(_, error) => {
					console.log("Error fetching blocks: ", error);
				}
			);
		});
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
