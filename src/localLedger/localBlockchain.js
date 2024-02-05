import SQlite from "react-native-sqlite-storage";
import uuid from "react-native-uuid";

const Db = SQlite.openDatabase(
	{
		name: "BlockchainDB",
		location: "default",
	},
	() => {
		console.log("Db opened!");
	}
);

const createTables = () => {
	Db.transaction((tx) => {
		tx.executeSql(
			`CREATE TABLE IF NOT EXISTS Blocks (
            block_id TEXT PRIMARY KEY,
            block_depth INTEGER,
            timestamp INTEGER,
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
	});
};

const insertBlock = (block, transaction_id) => {
	Db.transaction((tx) => {
		tx.executeSql(
			"INSERT INTO Blocks (block_id, block_depth, timestamp, prev_block_hash, utxos_merkle_root, block_hash) VALUES (?, ?, ?, ?, ?, ?)",
			[
				transaction_id,
				block.block_depth,
				block.timestamp,
				block.prev_block_hash,
				block.utxos_merkle_root,
				block.block_hash,
			],
			() => {
				console.log("Block inserted");
			},
			(error) => {
				console.log("Error inserting block: ", error);
			}
		);
	});
};

const insertBlockContent = (transaction) => {
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
				[transactionId, utxo_id],
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
				[transactionId, utxo_id],
				() => {
					console.log("UTXO inserted into Blocks content");
				}
			);
		});
	});
};
